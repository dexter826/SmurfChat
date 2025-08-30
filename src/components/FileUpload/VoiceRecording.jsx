import React, { useState, useRef } from 'react';
import { uploadVoiceRecording } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import { useAlert } from '../../Context/AlertProvider';

const VoiceRecording = ({ onVoiceUploaded, disabled = false }) => {
  const { user } = React.useContext(AuthContext);
  const { error } = useAlert();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Start voice recording
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      error('Ghi âm không được hỗ trợ trên thiết bị này');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try different audio formats for better browser compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      // Use the first supported mime type
      const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Try different audio formats for better browser compatibility
        let audioBlob;
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/wav'
        ];
        
        // Use the first supported mime type
        const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
        audioBlob = new Blob(audioChunks, { type: supportedMimeType });
        
        setIsUploading(true);
        
        try {
          const result = await uploadVoiceRecording(audioBlob, user.uid, recordingTime);
          onVoiceUploaded({
            ...result,
            category: 'voice',
            messageType: 'voice',
            duration: recordingTime,
            type: supportedMimeType // Pass the actual mime type used
          });
        } catch (err) {
          console.error('Error uploading voice:', err);
          error('Lỗi khi tải file ghi âm lên');
        } finally {
          setIsUploading(false);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      error('Lỗi khi bắt đầu ghi âm. Vui lòng kiểm tra quyền truy cập microphone.');
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isUploading}
        className={`p-2 rounded-full transition-colors disabled:opacity-50 ${
          isRecording 
            ? 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
        title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
      >
        {isUploading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
        ) : isRecording ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900 px-3 py-1 rounded-lg whitespace-nowrap">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-300">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecording;
