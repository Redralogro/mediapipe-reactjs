/* eslint-disable eqeqeq */
// import {amqp} from 'amqplib';
import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import React from 'react'
import {useRef, useEffect, useState} from "react";
import * as cam from "@mediapipe/camera_utils";
import {drawRectangle} from "@mediapipe/drawing_utils";
import Webcam from "react-webcam";
import axios from 'axios';
import {FaceDetection} from "@mediapipe/face_detection";
import {Button, Row, Col} from 'reactstrap';
import {Buffer} from "buffer";
import "../src/face_detection.css"
import logo from "./assets/LOGO.png"

function App() {
    // eslint-disable-next-line
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [captureCount, setCaptureCount] = useState(0);
    const [folderName, setFolderName] = useState('');
    const [name, setName] = useState('');
    const [nameList, setNameList] = useState([]);
    // const [isSaving, setIsSaving] = useState(false);
    // const boundingBoxRef = useRef(null);
    const [faces, setFaces] = useState([]);
    var camera = null;

    const captureFaceImage = async (i) => {
        const imageSrc = webcamRef.current.getScreenshot();
        const formData = new FormData();
        try {
            // Send the captured images and metadata to the API endpoint
            const response = await axios.post('https://10.100.140.54:8702/send_image', {
                "folderName": folderName,
                'image': imageSrc,
                'index': i
            });
            console.log(response.data); // Assuming the API returns a response
        } catch (error) {
            console.error(error);
        }
        // Example: Saving the captured image to the state
        setCaptureCount(i);
        if (i == 39) {
            try {
                const res = await axios.post('https://10.100.140.54:8088/create_tree', {"create": true})
                console.log(res.data);
                setCaptureCount(0);
            } catch (error) {
                console.error(error);
            }
        }
        setCaptureCount(prevCount => prevCount + 1);
    };

    const captureImages = () => {
        setCaptureCount(0);
        if (folderName == "") {
            alert("Vui lòng nhập tên")
        }
        // Capture 40 face images with a delay of 200 milliseconds
        else for (let i = 0; i < 40; i++) {
            setTimeout(() => {
                captureFaceImage(i);
            }, i * 300);
        }
    };


    function onResults(results) {
        // const video = webcamRef.current.video;
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        // Set canvas width
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext("2d");
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(
            results.image,
            0,
            0,
            canvasElement.width,
            canvasElement.height
        );
        const detectedFaces = [];
        const nList = [];
        if (results.detections.length > 0) {
            // recognizer(canvasElement.toDataURL()).then((res) => {
            //     if (res) {
            //         console.log(res)
            //         setName(res)
            //         setNameList(res)
            //     } else {
            //         setName('unknown')
            //         // drawRectangle(canvasCtx, faceDetection.boundingBox, {color: 'red', lineWidth: 4, fillColor: '#00000000'});
            //     }
            // })
            results.detections.map(async (faceDetection, i) => {
                // drawRectangle(canvasCtx, faceDetection.boundingBox, {color: 'blue', lineWidth: 4, fillColor: '#00000000'});
                const {xCenter, yCenter, width, height} = faceDetection.boundingBox;
                const w = videoWidth * width
                const h = videoHeight * height
                const x = xCenter * videoWidth - w / 2
                const y = yCenter * videoHeight - h / 2
                const faceImage = cropFaceImage(webcamRef.current.video, x, y, w, h);
                detectedFaces.push(faceImage);

                canvasCtx.font = "30px serif";
                // canvasCtx.fillText("oke", x, y);
                // drawRectangle(canvasCtx, faceDetection.boundingBox, {color: 'red', lineWidth: 4, fillColor: '#00000000'});
                // let name = "null";
                drawRectangle(canvasCtx, faceDetection.boundingBox, {
                    color: 'green',
                    lineWidth: 4,
                    fillColor: '#00000000'
                });

            })

        }
        setFaces(detectedFaces);
        // canvasCtx.restore();
        // canvasElement.remove();
    }


    // }
    const recognizer = async (faceImage) => {
        // const res = await axios.post('https://10.100.140.54:8088/recognition', {"face": ""})
        const res = await axios.post('https://10.100.140.54:8088/recognition', {"face": faceImage})
        return res.data.message
    }

    function cropFaceImage(video, x, y, width, height) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, x, y, width, height, 0, 0, width, height);
        return canvas.toDataURL();
    }

    function frame(video, width, height) {
        const canvas = document.createElement('canvas_');
        const context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL();
    }

    const handleFolderNameChange = (event) => {
        setFolderName(event.target.value);
    };
    // setInterval(())
    useEffect(() => {
        const faceDetection = new FaceDetection({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
            }
        });
        faceDetection.setOptions({
            model: 'short',
            minDetectionConfidence: 0.9
        });
        faceDetection.onResults(onResults);

        if (typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null) {
            // eslint-disable-next-line
            camera = new cam.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    await faceDetection.send({image: webcamRef.current.video});
                },
                width: 1280,
                height: 720
            });
            camera.start();
        }
    }, []);

    return (
        <div className="app">
            <div className="container" style={{
                boxSizing: "border-box",
                padding: "30px 0",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexDirection: "column",
                gap: 30
            }}>
                <img src={logo} id="logo_company" alt="logo_company"/>
                <div>
                    {/*<input type="text" style={{width: "548px", height: "39px", marginLeft: "10px"}} value={folderName}*/}
                    {/*       onChange={handleFolderNameChange} id="text-input" placeholder="Enter Name"/>*/}
                    {/*<button className="btn btn-primary" onClick={captureImages}>Capture</button>*/}
                    {/* <Button onClick={captureImages} color="info">Capture</Button> */}
                    <div className="input-group mb-3">
                        <input type="text" className="form-control" placeholder="Enter Name"
                               onChange={handleFolderNameChange} value={folderName} id="text-input"
                               aria-label="Recipient's username"
                               aria-describedby="basic-addon2">
                        </input>
                        <div className="input-group-append">
                            <button className="btn btn-outline-secondary" type="button"
                                    onClick={captureImages}>Add
                            </button>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 className="capture-count">Captured Images: {captureCount}</h5>
                </div>
                < Webcam className="webcam" ref={webcamRef} audio={false} screenshotFormat="image/jpeg"
                         imageSmoothing={true} mirrored={true}/>
                <div className="webcam-wrapper" style={{width: "100%", display: "flex",justifyContent:"center", gap: 20}}>
                    <canvas ref={canvasRef} style={{maxWidth: 640}} className="output_canvas"/>
                    <div className="time-keeping-found">
                        <>
                            {faces.length > 0 && (
                                <div className="face-container">
                                    <div className="row" style={{textAlign:"center"}}>
                                        {faces.map((face, index) => (
                                            <div className="col-3 col-lg-6 col-xl-4 col-xxl-3" key={index}>
                                                <img
                                                style={{width: "100%", height: "auto"}} key={index} src={face}
                                                alt={`Face ${index}`} className="face-image"/>
                                                <p>{`${nameList[index]?nameList[index]:"Guest"}`}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    </div>
                </div>
            </div>
            {/* <div>
        {capturedImages.map((imageSrc, index) => (
            <img key={index} src={imageSrc} alt={`Capture ${index}`} />
        ))}
        </div> */}
        </div>
    );
}

export default App;