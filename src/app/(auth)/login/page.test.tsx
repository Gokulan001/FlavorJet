import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useActionState } from "react";

function attachFileToInput(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  Object.defineProperty(input, "files", {
    configurable: true,
    writable: true,
    value: dt.files,
  });
  fireEvent.change(input);
}

const stateStore = {
  signup: {} as { errors?: Record<string, string> },
  signin: {} as { errors?: Record<string, string> },
};

vi.mock("@/actions/auth-actions", () => ({
  signup: vi.fn(async () => stateStore.signup),
  login: vi.fn(async () => stateStore.signin),
}));

vi.mock("next/navigation", async () => {
  const mock = await import("@/test/mocks/next-navigation");
  return {
    ...mock,
    useSearchParams: () => new URLSearchParams("redirect=/menu"),
  };
});

vi.mock("next/image", () => import("@/test/mocks/next-image"));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: vi.fn(),
  };
});

const { default: LoginPage } = await import("./page");
const { signup: mockedSignup, login: mockedLogin } = await import("@/actions/auth-actions");
const useActionStateMock = useActionState as unknown as ReturnType<typeof vi.fn>;

function configureUseActionState() {
  useActionStateMock.mockImplementation(((action: unknown, initial: unknown) => {
    if (action === mockedSignup) {
      return [
        Object.keys(stateStore.signup).length ? stateStore.signup : initial,
        action,
        false,
      ];
    }
    if (action === mockedLogin) {
      return [
        Object.keys(stateStore.signin).length ? stateStore.signin : initial,
        action,
        false,
      ];
    }
    return [initial, action, false];
  }) as never);
}

beforeEach(() => {
  stateStore.signup = {};
  stateStore.signin = {};
  (mockedSignup as ReturnType<typeof vi.fn>).mockClear();
  (mockedLogin as ReturnType<typeof vi.fn>).mockClear();
  useActionStateMock.mockReset();
  configureUseActionState();
});

function getSigninForm() {
  return screen.getByRole("heading", { name: "Sign in" }).closest("form")!;
}
function getSignupForm() {
  return screen.getByRole("heading", { name: "Sign up" }).closest("form")!;
}

describe("LoginPage — initial render", () => {
  it("signin form is visible (opacity-100), signup form is hidden (opacity-0)", () => {
    render(<LoginPage />);
    expect(getSigninForm()).toHaveClass("opacity-100");
    expect(getSignupForm()).toHaveClass("opacity-0");
  });

  it("signin form has only username + password (no email, no file)", () => {
    render(<LoginPage />);
    const form = getSigninForm();
    expect(within(form).getByPlaceholderText("Username")).toBeInTheDocument();
    expect(within(form).getByPlaceholderText("Password")).toBeInTheDocument();
    expect(within(form).queryByPlaceholderText("Email")).not.toBeInTheDocument();
  });

  it("signup form has username, email, password and profilePicture", () => {
    render(<LoginPage />);
    const form = getSignupForm();
    expect(within(form).getByPlaceholderText("Username")).toBeInTheDocument();
    expect(within(form).getByPlaceholderText("Email")).toBeInTheDocument();
    expect(within(form).getByPlaceholderText("Password")).toBeInTheDocument();
    expect(form.querySelector('input[name="profilePicture"]')).toBeInTheDocument();
  });

  it("hidden redirectTo inputs reflect ?redirect= from URL on both forms", () => {
    render(<LoginPage />);
    const hiddens = document.querySelectorAll('input[type="hidden"][name="redirectTo"]');
    expect(hiddens).toHaveLength(2);
    hiddens.forEach((el) => expect((el as HTMLInputElement).value).toBe("/menu"));
  });
});

function getLeftPanelToggle() {
  // "New here?" heading lives in the left panel; the panel's toggle button switches to signup mode
  const panel = screen.getByRole("heading", { name: "New here?" }).closest("div")!.parentElement!;
  return within(panel).getByRole("button", { name: "Sign up" });
}

function getRightPanelToggle() {
  // "One of us?" heading lives in the right panel; toggles back to signin
  const panel = screen.getByRole("heading", { name: "One of us?" }).closest("div")!.parentElement!;
  return within(panel).getByRole("button", { name: "Sign in" });
}

describe("LoginPage — mode toggle", () => {
  it("clicking the desktop 'Sign up' panel button switches to signup mode", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(getLeftPanelToggle());
    await waitFor(() => {
      expect(getSignupForm()).toHaveClass("opacity-100");
      expect(getSigninForm()).toHaveClass("opacity-0");
    });
  });

  it("clicking 'Sign in' after toggling switches back", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(getLeftPanelToggle());
    await waitFor(() => expect(getSignupForm()).toHaveClass("opacity-100"));
    await user.click(getRightPanelToggle());
    await waitFor(() => expect(getSigninForm()).toHaveClass("opacity-100"));
  });

  it("toggle clears typed values in the signin form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const signinUsername = within(getSigninForm()).getByPlaceholderText("Username") as HTMLInputElement;
    await user.type(signinUsername, "logan");
    expect(signinUsername.value).toBe("logan");

    await user.click(getLeftPanelToggle());
    await waitFor(() => {
      expect((within(getSigninForm()).getByPlaceholderText("Username") as HTMLInputElement).value).toBe("");
    });
  });
});

describe("LoginPage — password show/hide", () => {
  it("password input starts as type=password with no eye toggle next to it", () => {
    render(<LoginPage />);
    const pwField = within(getSigninForm()).getByPlaceholderText("Password") as HTMLInputElement;
    expect(pwField.type).toBe("password");
    const eyeBtn = pwField.parentElement!.querySelector("button[type='button']");
    expect(eyeBtn).toBeNull();
  });

  it("typing into password reveals the eye toggle, clicking flips input type", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const pwField = within(getSigninForm()).getByPlaceholderText("Password") as HTMLInputElement;
    await user.type(pwField, "secret");
    const toggle = pwField.parentElement!.querySelector("button[type='button']") as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    await user.click(toggle);
    expect(pwField.type).toBe("text");
  });
});

describe("LoginPage — signup image preview", () => {
  it("selecting a file renders a preview", async () => {
    render(<LoginPage />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await act(async () => {
      attachFileToInput(fileInput, file);
    });
    await waitFor(() => {
      expect(screen.getByAltText("Profile preview")).toBeInTheDocument();
    });
    expect(screen.getByText("Change Photo")).toBeInTheDocument();
  });

  it("remove (×) button clears preview", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await act(async () => {
      attachFileToInput(fileInput, file);
    });

    const preview = await screen.findByAltText("Profile preview");
    const removeBtn = preview.parentElement!.parentElement!.querySelector("button") as HTMLButtonElement;
    await user.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByAltText("Profile preview")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Upload Profile Picture")).toBeInTheDocument();
  });
});

describe("LoginPage — error rendering", () => {
  it("renders signin errors in the red summary box", () => {
    stateStore.signin = { errors: { credentials: "Invalid username or password" } };
    configureUseActionState();
    render(<LoginPage />);
    expect(screen.getByText("Invalid username or password")).toBeInTheDocument();
  });

  it("renders signup errors as a bulleted list", () => {
    stateStore.signup = {
      errors: {
        username: "Username is required",
        email: "Invalid email address",
        password: "Password must be at least 8 characters",
        profilePicture: "Profile picture is required",
      },
    };
    configureUseActionState();
    render(<LoginPage />);
    expect(screen.getByText("Please fix these issues:")).toBeInTheDocument();
    expect(screen.getByText("Username is required")).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    expect(screen.getByText("Profile picture is required")).toBeInTheDocument();
  });

  it("applies red border to the signup username field when errors.username present", () => {
    stateStore.signup = { errors: { username: "Username is required" } };
    configureUseActionState();
    render(<LoginPage />);
    const usernameInput = within(getSignupForm()).getByPlaceholderText("Username");
    expect(usernameInput.parentElement).toHaveClass("border-red-400");
  });

  it("applies red border to the signup email field when errors.email present", () => {
    stateStore.signup = { errors: { email: "Invalid email address" } };
    configureUseActionState();
    render(<LoginPage />);
    const emailInput = within(getSignupForm()).getByPlaceholderText("Email");
    expect(emailInput.parentElement).toHaveClass("border-red-400");
  });
});

describe("LoginPage — action wiring", () => {
  it("registers useActionState with the signup and login server actions", () => {
    render(<LoginPage />);
    const actionsRegistered = useActionStateMock.mock.calls.map((call) => call[0]);
    expect(actionsRegistered).toContain(mockedSignup);
    expect(actionsRegistered).toContain(mockedLogin);
  });

  it("both forms have action attributes set by React (useActionState wired)", () => {
    render(<LoginPage />);
    expect(getSigninForm().getAttribute("action")).toBeTruthy();
    expect(getSignupForm().getAttribute("action")).toBeTruthy();
  });
});
