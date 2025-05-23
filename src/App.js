// Dependencies: React, Bootstrap CSS, Gemini API client (assumed to be installed)

import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function AnswerSheetChecker() {
  const [image, setImage] = useState(null);
  const [modelAnswer, setModelAnswer] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      await extractText(file);
    }
  };

  const extractText = async (file) => {
    setLoading(true);
    setError(null);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      // Compress image before converting to base64
      const compressedFile = await compressImage(file);
      
      // Convert image to base64
      const base64data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(compressedFile);
      });

      const response = await fetch('http://localhost:5001/api/extract-text', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          image: base64data,
          mimeType: compressedFile.type 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract text from image');
      }

      const data = await response.json();
      if (!data.text) {
        throw new Error('No text was extracted from the image');
      }
      
      setStudentAnswer(data.text);
    } catch (error) {
      console.error('Error extracting text:', error);
      setError(error.message || 'Failed to extract text from image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to compress image
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with reduced quality
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            },
            'image/jpeg',
            0.7 // Quality: 0.7 (70%)
          );
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
    });
  };

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5001/api/compare-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelAnswer, student: studentAnswer }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate the response structure
      if (!data.score || !data.feedback || !data.suggestions) {
        throw new Error('Invalid response format from server');
      }

      setEvaluation(data);
    } catch (error) {
      console.error('Error comparing answers:', error);
      setError(error.message || 'Failed to compare answers. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="container py-5">
      <h1 className="text-center mb-4 text-primary">📄 Answer Sheet Evaluator</h1>

      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Upload Answer Sheet</h5>
          <input type="file" accept="image/*" className="form-control" onChange={handleCapture} />
          {image && <img src={image} alt="Captured" className="img-fluid mt-3 rounded border" />}
        </div>
      </div>

      <div className="card mb-4 shadow-sm">
        <div className="card-body">
          <h5 className="card-title">Model Answer</h5>
          <textarea
            value={modelAnswer}
            onChange={(e) => setModelAnswer(e.target.value)}
            rows="6"
            className="form-control"
            placeholder="Enter the model answer here..."
          ></textarea>
        </div>
      </div>

      {studentAnswer && (
        <div className="card mb-4 shadow-sm">
          <div className="card-body">
            <h5 className="card-title">Extracted Student Answer</h5>
            <div className="p-3 bg-light rounded">
              {studentAnswer}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-4">
        <button
          className="btn btn-primary px-5"
          onClick={handleCompare}
          disabled={loading || !modelAnswer || !studentAnswer}
        >
          {loading ? 'Processing...' : 'Compare Answers'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {evaluation && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="card-title text-success text-center mb-4">Evaluation Result</h5>
            
            <div className="text-center mb-4">
              <h2 className="display-4">Score: {evaluation.score}/10</h2>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header bg-primary text-white">
                    Content Accuracy (0-3 points)
                  </div>
                  <div className="card-body">
                    <p className="card-text">{evaluation.feedback.contentAccuracy}</p>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header bg-success text-white">
                    Completeness (0-2 points)
                  </div>
                  <div className="card-body">
                    <p className="card-text">{evaluation.feedback.completeness}</p>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card mb-3">
                  <div className="card-header bg-info text-white">
                    Clarity and Organization (0-2 points)
                  </div>
                  <div className="card-body">
                    <p className="card-text">{evaluation.feedback.clarity}</p>
                  </div>
                </div>

                <div className="card mb-3">
                  <div className="card-header bg-warning text-dark">
                    Technical Accuracy (0-3 points)
                  </div>
                  <div className="card-body">
                    <p className="card-text">{evaluation.feedback.technicalAccuracy}</p>
                  </div>
                </div>
              </div>
            </div>

            {evaluation.suggestions && evaluation.suggestions.length > 0 && (
              <div className="mt-4">
                <h5 className="text-primary">Suggestions for Improvement:</h5>
                <ul className="list-group">
                  {evaluation.suggestions.map((suggestion, index) => (
                    <li key={index} className="list-group-item">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
