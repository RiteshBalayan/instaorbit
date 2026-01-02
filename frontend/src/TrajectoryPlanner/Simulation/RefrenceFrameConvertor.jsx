import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

const normalize = (vector) => {
    const magnitude = Math.sqrt(vector[0]**2 + vector[1]**2 + vector[2]**2);
    return [vector[0]/magnitude , vector[1]/magnitude, vector[2]/magnitude];
  };
  
const crossProduct = (vecA, vecB) => [
    vecA[1] * vecB[2] - vecA[2] * vecB[1],
    vecA[2] * vecB[0] - vecA[0] * vecB[2],
    vecA[0] * vecB[1] - vecA[1] * vecB[0],
  ];

  // Matrix multiplication: 3x3 matrix with a 3x1 vector
const matrixMultiply = (matrix, vector) => [
  matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
  matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
  matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
];

const GetVNB = ({ inputVector, coordinates, velocity }) => {
 
  console.log('this is velocity', velocity);
  // Calculate V (velocity), N (normal), and B (binormal) axes
  const vHat = normalize(velocity);
  const nHat = normalize(coordinates).map(num => -Math.abs(num));
  const bHat = crossProduct(vHat, nHat); // binormal
  console.log('vHat',vHat);
  console.log('nHat',nHat);
  console.log('bHat',bHat);

  // Construct the rotation matrix using v-hat, n-hat, and h-hat
  const rotationMatrix = [
    vHat,  // First row
    nHat,  // Second row
    bHat   // Third row (was hHat, should be bHat)
  ];

  // Multiply the input vector by the rotation matrix
  const outputVector = matrixMultiply(rotationMatrix, inputVector);
  
  return outputVector; // Returning the VNB frame
};

export default GetVNB;
  