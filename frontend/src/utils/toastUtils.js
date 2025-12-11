import React from 'react';

let toastCallback = null;

export const setToastCallback = (callback) => {
  toastCallback = callback;
};

export const showToast = (message, type = 'info', duration = 3000) => {
  if (toastCallback) {
    toastCallback({ message, type, duration });
  }
};

export const showSuccessToast = (message, duration = 3000) => {
  showToast(message, 'success', duration);
};

export const showErrorToast = (message, duration = 3000) => {
  showToast(message, 'error', duration);
};

export const showWarningToast = (message, duration = 3000) => {
  showToast(message, 'warning', duration);
};

export const showInfoToast = (message, duration = 3000) => {
  showToast(message, 'info', duration);
};
