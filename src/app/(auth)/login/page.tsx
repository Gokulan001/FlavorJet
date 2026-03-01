"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { User, Mail, Lock, Camera, Eye, EyeOff, X, Loader2 } from "lucide-react";
import { signup, login, type AuthFormState } from "@/actions/auth-actions";

const initialState: AuthFormState = {};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signupFormState, signupFormAction] = useActionState(signup, initialState);
  const [signinFormState, signinFormAction] = useActionState(login, initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const toggleMode = () => {
    setIsSignUpMode((prev) => !prev);
    setImagePreview(null);
    setSelectedFile(null);
    setSignupForm({ username: "", email: "", password: "" });
    setLoginForm({ username: "", password: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onProfilePictureSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Re-attach file after form errors (React resets file inputs)
  useEffect(() => {
    if (selectedFile && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(selectedFile);
      fileInputRef.current.files = dataTransfer.files;
    }
  }, [signupFormState, selectedFile]);

  const signupErrors = signupFormState?.errors;
  const signinErrors = signinFormState?.errors;

  return (
    <div className="relative w-full min-h-screen bg-white dark:bg-[#0b1120] overflow-hidden">
      {/* Animated Background Circle */}
      <div
        className={`absolute h-[2000px] w-[2000px] top-[-10%] rounded-full bg-gradient-to-br from-[#fea116] to-[#f3c156] z-[6] transition-all duration-[1.8s] ease-in-out ${
          isSignUpMode
            ? "right-[52%] translate-x-full -translate-y-1/2"
            : "right-[48%] -translate-y-1/2"
        }`}
      />

      {/* Forms Container */}
      <div className="absolute w-full h-full top-0 left-0">
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-full md:w-1/2 transition-all duration-1000 delay-700 ease-in-out z-[5] grid grid-cols-1 ${
            isSignUpMode ? "left-1/2 md:left-[25%]" : "left-1/2 md:left-[75%]"
          } -translate-x-1/2`}
        >
          {/* ─── SIGN IN FORM ─── */}
          <form
            action={signinFormAction}
            className={`flex flex-col items-center justify-center px-5 sm:px-12 transition-all duration-200 delay-700 col-start-1 row-start-1 ${
              isSignUpMode ? "opacity-0 z-[1]" : "opacity-100 z-[2]"
            }`}
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <h2 className="text-3xl font-bold text-gray-700 dark:text-white mb-6">Sign in</h2>

            {/* Username */}
            <div className="flex items-center w-full max-w-[380px] h-14 bg-gray-100 dark:bg-slate-800 rounded-full my-3 px-5">
              <User className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, username: e.target.value })
                }
                autoComplete="username"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Password */}
            <div className="flex items-center w-full max-w-[380px] h-14 bg-gray-100 dark:bg-slate-800 rounded-full my-3 px-5">
              <Lock className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                autoComplete="current-password"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              />
              {loginForm.password && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-[#fea116] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            {/* Errors */}
            {signinErrors && (
              <div className="w-full max-w-[380px] bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-xl p-3 mt-3 animate-fade-in">
                {Object.values(signinErrors).map((error, i) => (
                  <p key={i} className="text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </p>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full max-w-[380px] sm:w-[200px] h-12 rounded-full bg-[#fea116] text-white font-semibold uppercase mt-6 hover:bg-[#f3c156] transition-colors shadow-md hover:shadow-lg"
            >
              Login
            </button>

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="mt-6 text-[#fea116] font-medium md:hidden"
            >
              New here? Sign up
            </button>
          </form>

          {/* ─── SIGN UP FORM ─── */}
          <form
            action={signupFormAction}
            className={`flex flex-col items-center justify-center px-5 sm:px-12 transition-all duration-200 delay-700 col-start-1 row-start-1 ${
              isSignUpMode ? "opacity-100 z-[2]" : "opacity-0 z-[1]"
            }`}
          >
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <h2 className="text-3xl font-bold text-gray-700 dark:text-white mb-6">Sign up</h2>

            {/* Username */}
            <div
              className={`flex items-center w-full max-w-[380px] h-14 rounded-full my-3 px-5 ${
                signupErrors?.username
                  ? "bg-red-50 dark:bg-red-950/30 border-2 border-red-400"
                  : "bg-gray-100 dark:bg-slate-800"
              }`}
            >
              <User className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={signupForm.username}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, username: e.target.value })
                }
                autoComplete="username"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Email */}
            <div
              className={`flex items-center w-full max-w-[380px] h-14 rounded-full my-3 px-5 ${
                signupErrors?.email
                  ? "bg-red-50 dark:bg-red-950/30 border-2 border-red-400"
                  : "bg-gray-100 dark:bg-slate-800"
              }`}
            >
              <Mail className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={signupForm.email}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, email: e.target.value })
                }
                autoComplete="email"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Password */}
            <div
              className={`flex items-center w-full max-w-[380px] h-14 rounded-full my-3 px-5 ${
                signupErrors?.password
                  ? "bg-red-50 dark:bg-red-950/30 border-2 border-red-400"
                  : "bg-gray-100 dark:bg-slate-800"
              }`}
            >
              <Lock className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
              <input
                type={showSignupPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={signupForm.password}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, password: e.target.value })
                }
                autoComplete="new-password"
                className="flex-1 bg-transparent outline-none text-gray-800 dark:text-white font-semibold placeholder-gray-400 dark:placeholder-slate-500"
              />
              {signupForm.password && (
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="text-gray-400 hover:text-[#fea116] transition-colors"
                >
                  {showSignupPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="w-full max-w-[380px] flex flex-col items-center gap-3 my-3">
              <div
                className={`flex items-center w-full h-14 rounded-full px-5 ${
                  signupErrors?.profilePicture
                    ? "bg-red-50 dark:bg-red-950/30 border-2 border-red-400"
                    : "bg-gray-100 dark:bg-slate-800"
                }`}
              >
                <Camera className="w-5 h-5 text-gray-400 dark:text-slate-500 mr-3 flex-shrink-0" />
                <input
                  type="file"
                  id="profilePicture"
                  name="profilePicture"
                  accept="image/*"
                  onChange={onProfilePictureSelected}
                  ref={fileInputRef}
                  className="hidden"
                />
                <label
                  htmlFor="profilePicture"
                  className="flex-1 leading-[56px] text-gray-400 font-medium cursor-pointer hover:text-[#fea116] transition-colors"
                >
                  {imagePreview ? "Change Photo" : "Upload Profile Picture"}
                </label>
              </div>

              {imagePreview && (
                <div className="relative animate-fade-in">
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 text-white border-2 border-white flex items-center justify-center z-10 hover:bg-red-600 transition-colors shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-[#fea116] shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full max-w-[380px] sm:w-[200px] h-12 rounded-full bg-[#fea116] text-white font-semibold uppercase mt-5 hover:bg-[#f3c156] transition-colors shadow-md hover:shadow-lg"
            >
              Sign up
            </button>

            {/* Errors */}
            {signupErrors && (
              <div className="w-full max-w-[380px] bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 rounded-xl p-3 mt-3 animate-fade-in">
                <p className="text-red-600 dark:text-red-400 text-sm font-semibold mb-1">
                  Please fix these issues:
                </p>
                <ul className="list-disc list-inside">
                  {Object.values(signupErrors).map((error, i) => (
                    <li key={i} className="text-red-600 dark:text-red-400 text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={toggleMode}
              className="mt-6 text-[#fea116] font-medium md:hidden"
            >
              Already have an account? Sign in
            </button>
          </form>
        </div>
      </div>

      {/* ─── PANELS ─── */}
      <div className="absolute h-full w-full top-0 left-0 grid grid-cols-2 max-md:hidden">
        {/* Left Panel */}
        <div
          className={`flex flex-col items-center justify-around text-center z-[6] p-12 ${
            isSignUpMode ? "pointer-events-none" : "pointer-events-auto"
          }`}
        >
          <div
            className={`text-white transition-transform duration-[0.9s] ease-in-out delay-600 ${
              isSignUpMode ? "-translate-x-[800px]" : "translate-x-0"
            }`}
          >
            <h3 className="text-2xl font-bold mb-2">New here?</h3>
            <p className="mb-4">Create an account to get started</p>
            <button
              type="button"
              onClick={toggleMode}
              className="px-8 py-2.5 border-2 border-white text-white rounded-full font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Sign up
            </button>
          </div>
          <Image
            src="/images/sign-in-panel.svg"
            alt="Sign in illustration"
            width={400}
            height={300}
            className={`max-w-full transition-transform duration-[1.1s] ease-in-out delay-400 ${
              isSignUpMode ? "-translate-x-[800px]" : "translate-x-0"
            }`}
          />
        </div>

        {/* Right Panel */}
        <div
          className={`flex flex-col items-center justify-around text-center z-[6] p-12 ${
            isSignUpMode ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div
            className={`text-white transition-transform duration-[0.9s] ease-in-out delay-600 ${
              isSignUpMode ? "translate-x-0" : "translate-x-[800px]"
            }`}
          >
            <h3 className="text-2xl font-bold mb-2">One of us?</h3>
            <p className="mb-4">Login with your existing account</p>
            <button
              type="button"
              onClick={toggleMode}
              className="px-8 py-2.5 border-2 border-white text-white rounded-full font-medium text-sm hover:bg-white/10 transition-colors"
            >
              Sign in
            </button>
          </div>
          <Image
            src="/images/sign-up-panel.svg"
            alt="Sign up illustration"
            width={400}
            height={300}
            className={`max-w-full transition-transform duration-[1.1s] ease-in-out delay-400 ${
              isSignUpMode ? "translate-x-0" : "translate-x-[800px]"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
