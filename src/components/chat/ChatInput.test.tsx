import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "./ChatInput";

function baseProps(overrides: Partial<React.ComponentProps<typeof ChatInput>> = {}) {
  return {
    value: "",
    onChange: vi.fn(),
    onSend: vi.fn(),
    onImageUpload: vi.fn(),
    uploadedImage: null,
    onClearImage: vi.fn(),
    isLoading: false,
    isListening: false,
    onToggleMic: vi.fn(),
    ...overrides,
  };
}

describe("ChatInput", () => {
  it("calls onChange when the user types", async () => {
    const props = baseProps();
    render(<ChatInput {...props} />);
    const input = screen.getByPlaceholderText("Ask about our menu...");
    await userEvent.type(input, "h");
    expect(props.onChange).toHaveBeenCalled();
  });

  it("Send button is disabled when value is empty and no uploaded image", () => {
    render(<ChatInput {...baseProps({ value: "" })} />);
    const sendBtn = screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it("Send button is enabled when value is non-empty and clicking it fires onSend", async () => {
    const props = baseProps({ value: "hi there" });
    render(<ChatInput {...props} />);
    const sendBtn = screen.getByRole("button", { name: "Send message" }) as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(false);
    await userEvent.click(sendBtn);
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it("Enter key submits when value is non-empty", async () => {
    const props = baseProps({ value: "hi" });
    render(<ChatInput {...props} />);
    const input = screen.getByPlaceholderText("Ask about our menu...");
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it("Enter does NOT submit when both value and uploadedImage are empty", async () => {
    const props = baseProps({ value: "   " });
    render(<ChatInput {...props} />);
    const input = screen.getByPlaceholderText("Ask about our menu...");
    input.focus();
    await userEvent.keyboard("{Enter}");
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it("placeholder switches to 'Listening...' when isListening", () => {
    render(<ChatInput {...baseProps({ isListening: true })} />);
    expect(screen.getByPlaceholderText("Listening...")).toBeInTheDocument();
  });

  it("disables the text input when isListening", () => {
    render(<ChatInput {...baseProps({ isListening: true })} />);
    const input = screen.getByPlaceholderText("Listening...") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("mic toggle button fires onToggleMic", async () => {
    const props = baseProps();
    render(<ChatInput {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Start voice input" }));
    expect(props.onToggleMic).toHaveBeenCalled();
  });

  it("mic button label switches to 'Stop listening' when isListening", () => {
    render(<ChatInput {...baseProps({ isListening: true })} />);
    expect(screen.getByRole("button", { name: "Stop listening" })).toBeInTheDocument();
  });

  it("renders an image preview and a Remove image button when uploadedImage is set", async () => {
    const props = baseProps({ uploadedImage: "data:image/png;base64,xxx" });
    render(<ChatInput {...props} />);
    expect(screen.getByAltText("Upload")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(props.onClearImage).toHaveBeenCalled();
  });

  it("Send button shows the spinner when isLoading and is disabled", () => {
    render(<ChatInput {...baseProps({ value: "hi", isLoading: true })} />);
    const sendBtn = screen.getByRole("button", { name: "Sending" }) as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
    expect(screen.getByTestId("send-spinner")).toBeInTheDocument();
  });

  it("uploads an image: FileReader produces a data URL and onImageUpload is called", async () => {
    const props = baseProps();
    render(<ChatInput {...props} />);

    // Stub FileReader to fire onload with a known result synchronously
    const originalFileReader = globalThis.FileReader;
    class StubFileReader {
      public onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      public result: string | null = null;
      readAsDataURL() {
        this.result = "data:image/png;base64,stub";
        this.onload?.({} as ProgressEvent<FileReader>);
      }
    }
    // @ts-expect-error overriding for the test
    globalThis.FileReader = StubFileReader;

    try {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["x"], "x.png", { type: "image/png" });
      // Use fireEvent to bypass happy-dom file-input click flow
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(props.onImageUpload).toHaveBeenCalledWith("data:image/png;base64,stub");
      });
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it("ignores non-image files", () => {
    const props = baseProps();
    render(<ChatInput {...props} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "x.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(props.onImageUpload).not.toHaveBeenCalled();
  });
});
