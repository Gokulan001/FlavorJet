import { vi } from "vitest";

export const uploadImage = vi.fn(async (): Promise<string> => {
  return "https://cdn.test/profile.jpg";
});

export function resetCloudinaryMock() {
  uploadImage.mockReset();
  uploadImage.mockImplementation(async () => "https://cdn.test/profile.jpg");
}
