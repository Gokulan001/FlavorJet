import { describe, it, expect, beforeEach, vi } from "vitest";

type StreamCallback = (
  error: Error | null,
  result?: { secure_url: string },
) => void;

const lastUploadOptions: { value: Record<string, unknown> | null } = { value: null };
const lastBuffer: { value: Buffer | null } = { value: null };
let nextResult: { secure_url: string } | null = null;
let nextError: Error | null = null;

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn(
        (options: Record<string, unknown>, callback: StreamCallback) => {
          lastUploadOptions.value = options;
          return {
            end: (buffer: Buffer) => {
              lastBuffer.value = buffer;
              queueMicrotask(() => {
                if (nextError) callback(nextError);
                else callback(null, nextResult!);
              });
            },
          };
        },
      ),
    },
  },
}));

import { uploadImage } from "./cloudinary";

describe("uploadImage", () => {
  beforeEach(() => {
    lastUploadOptions.value = null;
    lastBuffer.value = null;
    nextResult = { secure_url: "https://res.cloudinary.com/test/image.jpg" };
    nextError = null;
  });

  it("resolves with the secure_url on success", async () => {
    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    const url = await uploadImage(file);
    expect(url).toBe("https://res.cloudinary.com/test/image.jpg");
  });

  it("calls upload_stream with folder, resource_type and face-fill transformation", async () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    await uploadImage(file);
    expect(lastUploadOptions.value).toMatchObject({
      folder: "flavorjet-profiles",
      resource_type: "image",
      transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
    });
  });

  it("passes the File bytes through as a Buffer", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const file = new File([bytes], "a.png", { type: "image/png" });
    await uploadImage(file);
    expect(lastBuffer.value).toBeInstanceOf(Buffer);
    expect(lastBuffer.value && Array.from(lastBuffer.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects when cloudinary yields an error", async () => {
    nextError = new Error("upload failed");
    const file = new File(["x"], "a.png", { type: "image/png" });
    await expect(uploadImage(file)).rejects.toThrow("upload failed");
  });
});
