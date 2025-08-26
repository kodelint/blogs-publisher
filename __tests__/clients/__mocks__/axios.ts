import { AxiosInstance } from "axios";

// Create a properly typed mock
const mockAxios: jest.Mocked<AxiosInstance> = {
  create: jest.fn(() => mockAxios),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  head: jest.fn(),
  options: jest.fn(),
  request: jest.fn(),
  defaults: {
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      delete: {},
      patch: {},
    },
  },
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
      clear: jest.fn(),
    },
  },
  getUri: jest.fn(),
} as any; // Use 'as any' to avoid having to mock every single property

// Mock the isAxiosError function
const isAxiosError = jest.fn((error) => error?.isAxiosError);

export default {
  ...mockAxios,
  isAxiosError,
  create: jest.fn(() => mockAxios),
};
