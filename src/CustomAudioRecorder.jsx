import "./ui/CustomAudioRecorder.css";
import { Component, createElement } from "react";
import MicRecorder from "mic-recorder-to-mp3";
import { hot } from "react-hot-loader/root";

//import Recorder from "react-mp3-recorder";

const MP3Recorder = new MicRecorder({ bitRate: 128 });

class CustomAudioRecorder extends Component {
    // _onRecordingComplete = (blob) => {
    //     console.log('recording', blob)
    // }

    // _onRecordingError = (err) => {
    //     console.log('recording error', err)
    // }

    constructor(props) {
        super(props);
        this.state = {
            isRecording: false,
            blobURL: "",
            isBlocked: false,
            isPaused: false,
            token: "",
            blobStorage: {}
        };
        this._tryFireAction = this._tryFireAction.bind(this);
        this.uploadToAWS = this.uploadToAWS.bind(this);
        this.uploadToSpeakAI = this.uploadToSpeakAI.bind(this);
    }

    componentDidUpdate(prevProps) {
        const { presignedURLAttr, accessTokenAttr } = this.props;
        if (presignedURLAttr && accessTokenAttr) {
            if (
                presignedURLAttr.value &&
                accessTokenAttr.value &&
                prevProps.presignedURLAttr.value !== presignedURLAttr.value &&
                prevProps.accessTokenAttr.value !== accessTokenAttr.value
            ) {
                console.log("Uploading to S3");
                this.uploadToAWS()
                    .then(() => {
                        this.uploadToSpeakAI()
                            .then(() => {
                                console.log("Uploading to SpeakAI");
                            })
                            .catch(e => console.error(e));
                    })
                    .catch(e => console.error(e));
            }
        }
    }

    start = () => {
        if (this.state.isBlocked) {
            console.log("Permission Denied");
        } else {
            MP3Recorder.start()
                .then(() => {
                    this.setState({ isRecording: true, isPaused: false });
                })
                .catch(e => console.error(e));
        }
    };

    pause = () => {
        MP3Recorder.pause()
            .then(() => {
                this.setState({ isRecording: false, isPaused: true });
            })
            .catch(e => console.log(e));
    };
    resume = () => {
        MP3Recorder.resume()
            .then(() => {
                this.setState({ isRecording: true, isPaused: false });
            })
            .catch(e => console.log(e));
    };

    _tryFireAction = () => {
        const { onStopAction } = this.props;
        return Promise.resolve(onStopAction.execute());
    };

    uploadToAWS = () => {
        const { presignedURLAttr } = this.props;
        return fetch(presignedURLAttr.value, {
            method: "PUT",
            headers: {
                "Content-Type": "audio/mp3"
            },
            body: this.state.blobStorage
        });
    };

    uploadToSpeakAI = () => {
        const { uploadPresignedBlobAction } = this.props;
        return Promise.resolve(uploadPresignedBlobAction.execute());
        // const currentDateTime = new Date()
        //     .toString()
        //     .replace(/[:()]/g, "")
        //     .replace(/\s+/g, "");
        // const { presignedURLAttr, accessTokenAttr } = this.props;
        // return fetch("requesttUrl", {
        //     method: "POST",
        //     headers: {
        //         "x-speakai-key": "[keyhere]",
        //         "x-access-token": accessTokenAttr,
        //         "Content-Type": "application/json"
        //     },
        //     body: {
        //         name: currentDateTime + ".mp3",
        //         description: "Session audio at " + currentDateTime,
        //         url: presignedURLAttr,
        //         isVideo: false
        //     }
        // });
    };

    stop = () => {
        MP3Recorder.stop()
            .getMp3()
            .then(([buffer, blob]) => {
                const blobURL = URL.createObjectURL(blob);
                this.setState({ blobURL, isRecording: false, isPaused: false, blobStorage: blob });
                console.log(blobURL);
            })
            .then(() => {
                if (this.props.uploadOnStop) {
                    console.log("Upload process initiated.");
                    this._tryFireAction();
                }
            })
            .catch(e => console.log(e));
    };

    render() {
        return (
            <div className="audio-recorder">
                <audio src={this.state.blobURL} controls="controls" />
                <div className="button-group">
                    <button onClick={this.start} disabled={this.state.isRecording && !this.state.isPaused}>
                        Start
                    </button>
                    <button onClick={this.pause} disabled={!this.state.isRecording}>
                        Pause
                    </button>
                    <button onClick={this.stop} disabled={!this.state.isRecording && !this.state.isPaused}>
                        Stop
                    </button>
                </div>
            </div>
        );
    }

    componentDidMount() {
        navigator.mediaDevices.getUserMedia(
            { audio: true },
            () => {
                console.log("Permission Granted");
                this.setState({ isBlocked: false });
            },
            () => {
                console.log("Permission Denied");
                this.setState({ isBlocked: true });
            }
        );
    }
}

export default hot(CustomAudioRecorder);
