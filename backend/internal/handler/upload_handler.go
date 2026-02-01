package handler

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"medical-crm/internal/middleware"
	apperrors "medical-crm/pkg/errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	// Create upload directory if it doesn't exist
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		fmt.Printf("Warning: could not create upload directory: %v\n", err)
	}
	return &UploadHandler{
		uploadDir: uploadDir,
	}
}

// UploadImage handles image upload for X-ray photos
// POST /api/v1/doctor/uploads/image
func (h *UploadHandler) UploadImage(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	// Get the file from the request
	file, err := c.FormFile("image")
	if err != nil {
		appErr := apperrors.BadRequest("No image file provided")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Validate file size (max 10MB)
	if file.Size > 10*1024*1024 {
		appErr := apperrors.BadRequest("Image file too large (max 10MB)")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".gif":  true,
	}
	if !allowedExts[ext] {
		appErr := apperrors.BadRequest("Invalid image format. Allowed: jpg, jpeg, png, webp, gif")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Generate unique filename
	uniqueID := uuid.New().String()[:8]
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("xray_%d_%s%s", timestamp, uniqueID, ext)

	// Full path
	fullPath := filepath.Join(h.uploadDir, filename)

	// Save the file
	if err := c.SaveUploadedFile(file, fullPath); err != nil {
		appErr := apperrors.Internal("Failed to save image")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Return the URL path
	url := "/uploads/xray/" + filename

	c.JSON(http.StatusOK, gin.H{
		"url":      url,
		"filename": filename,
		"size":     file.Size,
	})
}

// DeleteImage handles image deletion
// DELETE /api/v1/doctor/uploads/image
func (h *UploadHandler) DeleteImage(c *gin.Context) {
	requestID := middleware.GetRequestID(c)

	var req struct {
		URL string `json:"url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		appErr := apperrors.BadRequest("URL is required")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Extract filename from URL
	filename := filepath.Base(req.URL)
	if filename == "" || filename == "." || filename == "/" {
		appErr := apperrors.BadRequest("Invalid file URL")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Full path
	fullPath := filepath.Join(h.uploadDir, filename)

	// Check if file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		appErr := apperrors.NotFound("File not found")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	// Delete the file
	if err := os.Remove(fullPath); err != nil {
		appErr := apperrors.Internal("Failed to delete image")
		c.JSON(appErr.HTTPStatus, apperrors.NewErrorResponse(appErr, requestID))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image deleted"})
}
