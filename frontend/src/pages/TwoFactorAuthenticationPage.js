import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { resendOtpTwoFactorAuthAsync, validateTwoFactorAuthAsync, validateTwoFactorAuthTokenAsync } from "../features/auth/authSlice";

const TwoFactorAuthenticationPage = () => {
    const { token } = useParams();
    document.title = "Two Factor Authentication";

    const { isValidTokenTwoFactor, isOtpValidationDone, isOtpResendSuccessful } = useSelector((state) => state.auth);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [otp, setOtp] = useState(""); // Stores the user's input for OTP
    const [resendTimer, setResendTimer] = useState(60); // 1-minute countdown for resend button
    const [resendDisabled, setResendDisabled] = useState(true); // Disable resend initially
    const [isResendingOtp, setIsResendingOtp] = useState(false); // Resend OTP status

    // Handle OTP input change
    const handleOtpChange = (e) => {
        setOtp(e.target.value);
    };

    // Resend OTP function
    const handleResendOtp = () => {
        setIsResendingOtp(true); // Set status to true
        setResendDisabled(true); // Disable button again
        dispatch(resendOtpTwoFactorAuthAsync(token)); // Resend OTP
    };

    // Submit OTP function
    const handleSubmitOtp = (e) => {
        e.preventDefault();
        if (otp.length === 6) {
            const data = {
                token,
                otp,
                navigate
            }
            dispatch(validateTwoFactorAuthAsync(data));
        } else {
            console.log("Invalid OTP. Please enter a valid 6-digit OTP.");
        }
    };

    // Resend Timer Logic
    useEffect(() => {
        if (resendTimer > 0) {
            const interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setResendDisabled(false); // Enable "Resend Code" button after timer ends
        }
    }, [resendTimer]);

    useEffect(() => {

        if (isOtpResendSuccessful && typeof isOtpResendSuccessful === "boolean") {
            setIsResendingOtp(false); // Reset status
            setResendTimer(60); // Reset the resend timer
            setOtp(""); // Clear the OTP input
            setResendDisabled(true); // Disable button again
        }

        let validateTokenInterval = setTimeout(() => {
            dispatch(validateTwoFactorAuthTokenAsync(token));
        }, 60000);

        if (!isValidTokenTwoFactor && typeof isValidTokenTwoFactor === "boolean") {
            navigate("/login");
        }

        if (isOtpValidationDone) {
            navigate("/profile");
        }

        isValidTokenTwoFactor ?? dispatch(validateTwoFactorAuthTokenAsync(token));

        return () => clearTimeout(validateTokenInterval);

    }, [isValidTokenTwoFactor, isOtpValidationDone, isOtpResendSuccessful]);

    return (
        <div className="container two-factor-auth-container d-flex justify-content-center py-2 px-2 mb-4 mb-md-5">
            <div className="shadow border rounded px-2 py-2 p-md-5">
                <div className="two-factor-auth-box">
                    <h2 className="two-factor-auth-title">Two-Factor Authentication</h2>
                    <p className="two-factor-auth-message">
                        We have sent a one-time password to your email. Your OTP will expire in <strong>15 minutes</strong>.
                    </p>
                    <form onSubmit={handleSubmitOtp}>
                        <div className="mb-3 text-start">
                            <label htmlFor="otp" className="two-factor-auth-label m-1">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                id="otp"
                                className="form-control two-factor-auth-input"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={handleOtpChange}
                                maxLength={6}
                                required
                            />
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <button
                                type="button"
                                className="btn two-factor-auth-resend-btn"
                                disabled={resendDisabled}
                                onClick={handleResendOtp}
                            >
                                Resend Code
                            </button>
                            {
                                isResendingOtp ?
                                    (
                                        <span className="two-factor-auth-resend-timer">
                                            Resending OTP Please Wait...
                                        </span>
                                    )
                                    :
                                    (
                                        <span className="two-factor-auth-timer">
                                            Resend available in:{" "}
                                            {resendDisabled ? `${resendTimer}s` : "Now"}
                                        </span>
                                    )
                            }
                        </div>
                        <button
                            type="submit"
                            className="btn two-factor-auth-submit-btn w-100"
                            disabled={otp.length !== 6}
                        >
                            Verify OTP
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TwoFactorAuthenticationPage;
