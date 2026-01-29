package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type ResendClient struct {
	apiKey  string
	baseURL string
}

type EmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type EmailResponse struct {
	ID string `json:"id"`
}

func NewResendClient() *ResendClient {
	return &ResendClient{
		apiKey:  os.Getenv("RESEND_API_KEY"),
		baseURL: "https://api.resend.com",
	}
}

func (c *ResendClient) SendInviteEmail(toEmail, clinicName, inviteLink string) error {
	if c.apiKey == "" {
		return fmt.Errorf("RESEND_API_KEY not configured")
	}

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 CRM Clinic</h1>
            <p>Sizni taklif qilishyapti!</p>
        </div>
        <div class="content">
            <h2>Assalomu alaykum!</h2>
            <p>Siz <strong>%s</strong> klinikasiga <strong>Boss</strong> sifatida taklif qilindingiz.</p>
            <p>Taklifni qabul qilish uchun quyidagi tugmani bosing:</p>
            <center>
                <a href="%s" class="button">✅ Taklifni Qabul Qilish</a>
            </center>
            <p><small>Yoki quyidagi linkni brauzeringizga nusxalang:</small></p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px; font-size: 12px;">%s</p>
            <p>Bu taklif <strong>7 kun</strong> ichida amal qiladi.</p>
        </div>
        <div class="footer">
            <p>© 2024 CRM Clinic. Barcha huquqlar himoyalangan.</p>
        </div>
    </div>
</body>
</html>
`, clinicName, inviteLink, inviteLink)

	emailReq := EmailRequest{
		From:    "CRM Clinic <onboarding@resend.dev>",
		To:      []string{toEmail},
		Subject: fmt.Sprintf("🏥 %s klinikasiga taklif", clinicName),
		HTML:    htmlContent,
	}

	jsonData, err := json.Marshal(emailReq)
	if err != nil {
		return fmt.Errorf("failed to marshal email request: %w", err)
	}

	req, err := http.NewRequest("POST", c.baseURL+"/emails", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("email API returned status %d", resp.StatusCode)
	}

	return nil
}
