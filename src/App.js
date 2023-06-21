/* eslint-disable eqeqeq */
import './App.css';
import React from 'react'
import { FaceMesh } from "@mediapipe/face_mesh";
import { useRef, useEffect } from "react";
import * as Facemesh from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import { efficient_pnp } from "./ePnP"

function App() {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const connect = window.drawConnectors;
    var camera = null;

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
        const img_w = canvasElement.width
        const img_h = canvasElement.height
        let face_3d = []
        let face_2d = []
        if (results.multiFaceLandmarks) {
            for (const landmarks of results.multiFaceLandmarks) {
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_TESSELATION, {
                    color: "#C0C0C070",
                    lineWidth: 1,
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYE, {
                    color: "#FF3030",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_EYEBROW, {
                    color: "#FF3030",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYE, {
                    color: "#30FF30",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_EYEBROW, {
                    color: "#30FF30",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_FACE_OVAL, {
                    color: "#E0E0E0",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_LIPS, {
                    color: "#E0E0E0",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_RIGHT_IRIS, {
                    color: "#FF3030",
                });
                connect(canvasCtx, landmarks, Facemesh.FACEMESH_LEFT_IRIS, {
                    color: "#30FF30",
                });

                for (const idx in landmarks) {
                    if (idx == 33 || idx == 263 || idx == 1 || idx == 61 || idx == 291 || idx == 199) {
                        // if (idx == 1){
                        //   let nose_2d  = [landmarks[idx].x* img_w, landmarks[idx].y* img_h]
                        //   // console.log(nose_2d)
                        // }
                        let x = Math.ceil(landmarks[idx].x * img_w)
                        let y = Math.ceil(landmarks[idx].y * img_h)
                            // Get the 2D Coordinates
                        face_2d.push([x, y])
                            // Get the 3D Coordinates
                        face_3d.push([x, y, landmarks[idx].z])
                    }
                }
                let focal_length = 1 * img_w
                    // eslint-disable-next-line no-unused-vars
                let cam_matrix = [
                    [focal_length, 0, img_h / 2],
                    [0, focal_length, img_w / 2],
                    [0, 0, 1]
                ]
                console.log(efficient_pnp(face_3d, face_2d, cam_matrix))
            }
        }
        canvasCtx.restore();
    }
    // }

    // setInterval(())
    useEffect(() => {
        const mpFaceMesh = window;
        const faceMesh = new FaceMesh({
            locateFile: (file) => {
                // return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@` +
                    `${mpFaceMesh.VERSION}/${file}`;
            },
        });

        faceMesh.setOptions({
            enableFaceGeometry: false,
            refineLandmarks: true,
            maxNumFaces: 2,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults(onResults);

        if (
            typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null
        ) {
            // eslint-disable-next-line
            camera = new cam.Camera(webcamRef.current.video, {
                onFrame: async() => {
                    await faceMesh.send({ image: webcamRef.current.video });
                },
                width: 640,
                height: 480,
            });
            camera.start();
        }
    }, []);
    return ( < center >
        <
        div className = "App" >
        <
        Webcam ref = { webcamRef }
        style = {
            {
                position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                left: 0,
                right: 0,
                textAlign: "center",
                zindex: 9,
                width: 640,
                height: 480,
            }
        }
        />{" "} <
        canvas ref = { canvasRef }
        className = "output_canvas"
        style = {
            {
                position: "absolute",
                marginLeft: "auto",
                marginRight: "auto",
                left: 0,
                right: 0,
                textAlign: "center",
                zindex: 9,
                width: 640,
                height: 480,
            }
        } >
        <
        /canvas> < /
        div > <
        /center>
    );
}

export default App;