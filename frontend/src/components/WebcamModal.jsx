import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, X, AlertTriangle, Check, FlipHorizontal, Smartphone } from 'lucide-react';

const WebcamModal = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Stream',
  subtitle = 'Capture photo directly using your webcam or mobile camera',
  overlayType = 'portrait', // 'portrait' | 'classroom'
  defaultFacingMode = 'user', // 'user' (front) | 'environment' (back/rear)
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState(defaultFacingMode);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [startingCamera, setStartingCamera] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Stop camera tracks cleanly
  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setStream(null);
    }
  };

  // Start webcam / camera stream
  const startCamera = async () => {
    stopStream();
    setCameraError('');
    setStartingCamera(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('WebRTC camera streaming is not supported on this browser. Please use the mobile camera shutter button below.');
      setStartingCamera(false);
      return;
    }

    try {
      const constraints = {
        audio: false,
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : {
              facingMode: { ideal: facingMode },
              width: { ideal: overlayType === 'classroom' ? 1920 : 1280 },
              height: { ideal: overlayType === 'classroom' ? 1080 : 720 },
            },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }

      // Enumerate available cameras
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      } catch (err) {
        // Enumerate not strictly required
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application.';
      } else {
        msg = `${err.message || 'Unable to start camera stream'}. You can still use the mobile camera button below.`;
      }
      setCameraError(msg);
    } finally {
      setStartingCamera(false);
    }
  };

  // Toggle between front (user) and rear (environment) camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    setSelectedDeviceId(''); // clear exact device id to let facingMode resolve
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      setCapturedBlob(null);
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, selectedDeviceId]);

  // Snap photo from video frame
  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    // If front camera, mirror image for natural selfie feel if desired, but face models prefer original orientation
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Failed to capture snapshot from video.');
          return;
        }
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPreview(previewUrl);
        setCapturedBlob(blob);
      },
      'image/jpeg',
      0.95
    );
  };

  // Confirm snapshot and return to parent
  const handleConfirmSnapshot = () => {
    if (!capturedBlob) return;
    const filename = `${overlayType}_capture_${Date.now()}.jpg`;
    const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
    stopStream();
    onCapture(file, capturedPreview);
    onClose();
  };

  // Retake photo
  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
  };

  // Mobile Native Shutter Fallback
  const handleNativeMobileCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    stopStream();
    onCapture(file, previewUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: overlayType === 'classroom' ? '820px' : '620px',
          width: '95%',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Camera size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                {title}
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                {subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
            }}
            title="Close Camera"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Viewport & Guidelines */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#020617',
            width: '100%',
            height: overlayType === 'classroom' ? 'min(420px, 46vh)' : 'min(380px, 42vh)',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {cameraError ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                maxWidth: '440px',
              }}
            >
              <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem', color: '#f8fafc' }}>
                Camera Not Accessible
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
                {cameraError}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ margin: '0 auto', gap: '0.4rem' }}
              >
                <Smartphone size={15} /> Use Mobile Camera Shutter Instead
              </button>
            </div>
          ) : capturedPreview ? (
            // Captured Snapshot Preview
            <img
              src={capturedPreview}
              alt="Captured"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            // Live Stream Video
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Portrait Oval Guideline */}
              {overlayType === 'portrait' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '210px',
                      height: '290px',
                      borderRadius: '50%',
                      border: '3px dashed #38bdf8',
                      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                    }}
                  />
                  <div
                    style={{
                      marginTop: '0.75rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#38bdf8',
                      letterSpacing: '0.02em',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    Position face inside oval
                  </div>
                </div>
              )}

              {/* Classroom Guideline */}
              {overlayType === 'classroom' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      alignSelf: 'center',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      padding: '0.3rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#4ade80',
                      border: '1px solid rgba(74, 222, 128, 0.3)',
                    }}
                  >
                    Classroom Camera Stream • Ready to Capture
                  </div>

                  {/* Corner Target Marks */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '15%',
                      left: '8%',
                      right: '8%',
                      bottom: '15%',
                      border: '1px dashed rgba(255, 255, 255, 0.25)',
                      borderRadius: '12px',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Hidden Native Mobile Shutter File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture={facingMode}
            onChange={handleNativeMobileCapture}
            style={{ display: 'none' }}
          />
        </div>

        {/* Modal Controls / Actions Footer */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#0b1120',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Camera Options (Switch Camera / Mobile Camera Shutter) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!capturedPreview && (
              <>
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                  title="Switch between Front and Back camera"
                >
                  <FlipHorizontal size={14} />
                  {facingMode === 'user' ? 'Switch to Rear Cam' : 'Switch to Front Cam'}
                </button>

                {availableDevices.length > 1 && (
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      maxWidth: '180px',
                    }}
                  >
                    <option value="" style={{ color: '#000' }}>Auto Camera</option>
                    {availableDevices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId} style={{ color: '#000' }}>
                        {d.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}

            {/* Mobile native camera button for phones/tablets */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
              }}
              title="Open native mobile camera shutter"
            >
              <Smartphone size={14} /> Mobile Cam
            </button>
          </div>

          {/* Right: Capture & Confirm Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <RefreshCw size={14} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSnapshot}
                  style={{
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)',
                  }}
                >
                  <Check size={16} /> Use Photo
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleSnap}
                disabled={startingCamera || !!cameraError}
                style={{
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  padding: '0.55rem 1.35rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: startingCamera || !!cameraError ? 'not-allowed' : 'pointer',
                  opacity: startingCamera || !!cameraError ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <Camera size={16} /> Snap Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebcamModal;
