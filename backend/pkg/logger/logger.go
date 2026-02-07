package logger

import (
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

// SensitiveFields that should never be logged
var SensitiveFields = []string{
	"password",
	"token",
	"access_token",
	"refresh_token",
	"authorization",
	"secret",
}

// Logger wraps zerolog.Logger
type Logger struct {
	zl zerolog.Logger
}

// New creates a new structured logger
func New(serviceName, environment string) *Logger {
	var output io.Writer = os.Stdout

	// Pretty print for development
	if environment == "development" {
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
	}

	zl := zerolog.New(output).
		With().
		Timestamp().
		Str("service", serviceName).
		Str("env", environment).
		Logger()

	zerolog.TimeFieldFormat = time.RFC3339Nano

	return &Logger{zl: zl}
}

// WithRequestID returns a new logger with request_id
func (l *Logger) WithRequestID(requestID string) *Logger {
	return &Logger{
		zl: l.zl.With().Str("request_id", requestID).Logger(),
	}
}

// WithClinic returns a new logger with clinic_id
func (l *Logger) WithClinic(clinicID string) *Logger {
	return &Logger{
		zl: l.zl.With().Str("clinic_id", clinicID).Logger(),
	}
}

// WithUser returns a new logger with user_id and role
func (l *Logger) WithUser(userID, role string) *Logger {
	return &Logger{
		zl: l.zl.With().Str("user_id", userID).Str("role", role).Logger(),
	}
}

// Info logs an info message
func (l *Logger) Info(msg string) {
	l.zl.Info().Msg(msg)
}

// Infof logs a formatted info message
func (l *Logger) Infof(format string, args ...interface{}) {
	l.zl.Info().Msgf(format, args...)
}

// InfoWithFields logs info with additional fields
func (l *Logger) InfoWithFields(msg string, fields map[string]interface{}) {
	event := l.zl.Info()
	for k, v := range fields {
		if !isSensitive(k) {
			event = event.Interface(k, v)
		}
	}
	event.Msg(msg)
}

// Error logs an error message
func (l *Logger) Error(msg string, err error) {
	l.zl.Error().Err(err).Msg(msg)
}

// ErrorWithStack logs an error with stack trace
func (l *Logger) ErrorWithStack(msg string, err error, stack string) {
	l.zl.Error().Err(err).Str("stack", stack).Msg(msg)
}

// ErrorWithFields logs an error with additional fields
func (l *Logger) ErrorWithFields(msg string, err error, fields map[string]interface{}) {
	event := l.zl.Error().Err(err)
	for k, v := range fields {
		if !isSensitive(k) {
			event = event.Interface(k, v)
		}
	}
	event.Msg(msg)
}

// Warn logs a warning message
func (l *Logger) Warn(msg string) {
	l.zl.Warn().Msg(msg)
}

// Warnf logs a formatted warning message
func (l *Logger) Warnf(format string, args ...interface{}) {
	l.zl.Warn().Msgf(format, args...)
}

// Debug logs a debug message
func (l *Logger) Debug(msg string) {
	l.zl.Debug().Msg(msg)
}

// Debugf logs a formatted debug message
func (l *Logger) Debugf(format string, args ...interface{}) {
	l.zl.Debug().Msgf(format, args...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(msg string, err error) {
	l.zl.Fatal().Err(err).Msg(msg)
}

// RequestLog logs an HTTP request
func (l *Logger) RequestLog(method, path string, status int, latencyMs int64, clientIP, userAgent string) {
	l.zl.Info().
		Str("method", method).
		Str("path", path).
		Int("status", status).
		Int64("latency_ms", latencyMs).
		Str("client_ip", clientIP).
		Str("user_agent", userAgent).
		Msg("request")
}

// isSensitive checks if a field name is sensitive
func isSensitive(field string) bool {
	lower := strings.ToLower(field)
	for _, s := range SensitiveFields {
		if strings.Contains(lower, s) {
			return true
		}
	}
	return false
}

// RedactSensitive redacts sensitive fields from a map
func RedactSensitive(data map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range data {
		if isSensitive(k) {
			result[k] = "[REDACTED]"
		} else {
			result[k] = v
		}
	}
	return result
}
