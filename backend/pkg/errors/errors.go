package errors

import (
	"fmt"
	"net/http"
	"runtime"
)

// Error codes
const (
	CodeInternal           = "INTERNAL_ERROR"
	CodeBadRequest         = "BAD_REQUEST"
	CodeUnauthorized       = "UNAUTHORIZED"
	CodeForbidden          = "FORBIDDEN"
	CodeNotFound           = "NOT_FOUND"
	CodeConflict           = "CONFLICT"
	CodeValidation         = "VALIDATION_ERROR"
	CodeInvalidCredentials = "INVALID_CREDENTIALS"
	CodeTokenExpired       = "TOKEN_EXPIRED"
	CodeTokenInvalid       = "TOKEN_INVALID"
	CodeInviteExpired      = "INVITE_EXPIRED"
	CodeInviteUsed         = "INVITE_USED"
	CodeAppointmentConflict = "APPOINTMENT_CONFLICT"
	CodeDiagnosisRequired  = "DIAGNOSIS_REQUIRED"
	CodeInvalidDiscount    = "INVALID_DISCOUNT"
)

// AppError is the application error type
type AppError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	HTTPStatus int    `json:"-"`
	Stack      string `json:"-"`
	Err        error  `json:"-"`
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (caused by: %v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// ErrorResponse is the standard error response format
type ErrorResponse struct {
	Error ErrorBody `json:"error"`
}

type ErrorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id"`
}

// NewErrorResponse creates a standard error response
func NewErrorResponse(err *AppError, requestID string) ErrorResponse {
	return ErrorResponse{
		Error: ErrorBody{
			Code:      err.Code,
			Message:   err.Message,
			RequestID: requestID,
		},
	}
}

// captureStack captures the stack trace
func captureStack() string {
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	return string(buf[:n])
}

// Error constructors

func Internal(message string) *AppError {
	return &AppError{
		Code:       CodeInternal,
		Message:    message,
		HTTPStatus: http.StatusInternalServerError,
		Stack:      captureStack(),
	}
}

func InternalWithErr(message string, err error) *AppError {
	return &AppError{
		Code:       CodeInternal,
		Message:    message,
		HTTPStatus: http.StatusInternalServerError,
		Stack:      captureStack(),
		Err:        err,
	}
}

func BadRequest(message string) *AppError {
	return &AppError{
		Code:       CodeBadRequest,
		Message:    message,
		HTTPStatus: http.StatusBadRequest,
	}
}

func Validation(message string) *AppError {
	return &AppError{
		Code:       CodeValidation,
		Message:    message,
		HTTPStatus: http.StatusBadRequest,
	}
}

func Unauthorized(message string) *AppError {
	return &AppError{
		Code:       CodeUnauthorized,
		Message:    message,
		HTTPStatus: http.StatusUnauthorized,
	}
}

func InvalidCredentials() *AppError {
	return &AppError{
		Code:       CodeInvalidCredentials,
		Message:    "Invalid email or password",
		HTTPStatus: http.StatusUnauthorized,
	}
}

func TokenExpired() *AppError {
	return &AppError{
		Code:       CodeTokenExpired,
		Message:    "Token has expired",
		HTTPStatus: http.StatusUnauthorized,
	}
}

func TokenInvalid() *AppError {
	return &AppError{
		Code:       CodeTokenInvalid,
		Message:    "Invalid token",
		HTTPStatus: http.StatusUnauthorized,
	}
}

func Forbidden(message string) *AppError {
	return &AppError{
		Code:       CodeForbidden,
		Message:    message,
		HTTPStatus: http.StatusForbidden,
	}
}

func NotFound(resource string) *AppError {
	return &AppError{
		Code:       CodeNotFound,
		Message:    fmt.Sprintf("%s not found", resource),
		HTTPStatus: http.StatusNotFound,
	}
}

func Conflict(message string) *AppError {
	return &AppError{
		Code:       CodeConflict,
		Message:    message,
		HTTPStatus: http.StatusConflict,
	}
}

func InviteExpired() *AppError {
	return &AppError{
		Code:       CodeInviteExpired,
		Message:    "Invitation has expired",
		HTTPStatus: http.StatusBadRequest,
	}
}

func InviteUsed() *AppError {
	return &AppError{
		Code:       CodeInviteUsed,
		Message:    "Invitation has already been used",
		HTTPStatus: http.StatusBadRequest,
	}
}

func AppointmentConflict() *AppError {
	return &AppError{
		Code:       CodeAppointmentConflict,
		Message:    "Time slot is already booked for this doctor",
		HTTPStatus: http.StatusConflict,
	}
}

func DiagnosisRequired() *AppError {
	return &AppError{
		Code:       CodeDiagnosisRequired,
		Message:    "Diagnosis is required to complete the visit",
		HTTPStatus: http.StatusBadRequest,
	}
}

func InvalidDiscount(message string) *AppError {
	return &AppError{
		Code:       CodeInvalidDiscount,
		Message:    message,
		HTTPStatus: http.StatusBadRequest,
	}
}
