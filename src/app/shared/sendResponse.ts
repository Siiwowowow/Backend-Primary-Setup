import {   Response } from "express";

interface IRresponseData<T> {
  httpCode: number;
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
export const sendResponse = <T>(res: Response, response: IRresponseData<T>) => {
  const { httpCode, success, message, data, error } = response;
  res.status(httpCode).json({
    success,
    message,
    data,
    error,

  });
};