import pytest
from unittest.mock import patch, MagicMock, mock_open
import os


class TestEmailConfig:
    """Tests for email configuration"""
    
    def test_config_loads_environment_variables(self):
        """Test that config loads environment variables"""
        from services.email.config import SENDER_EMAIL, RECIPIENT_EMAIL, SMTP_SERVER, SMTP_PORT
        
        # These should be loaded from .env file
        assert SENDER_EMAIL is not None
        assert RECIPIENT_EMAIL is not None
        assert SMTP_SERVER == "smtp.gmail.com"
        assert SMTP_PORT == 587
    
    def test_smtp_server_is_configured(self):
        """Test that SMTP server is properly configured"""
        from services.email.config import SMTP_SERVER, SMTP_PORT
        
        assert isinstance(SMTP_SERVER, str)
        assert len(SMTP_SERVER) > 0
        assert isinstance(SMTP_PORT, int)
        assert SMTP_PORT in [587, 465]  # Common SMTP ports


class TestCreateHtmlEmail:
    """Tests for create_html_email function"""
    
    @patch('builtins.open', new_callable=mock_open, read_data='<html><body>Test Email</body></html>')
    def test_create_html_email_reads_template(self, mock_file):
        """Test that create_html_email reads the template file"""
        from services.email.sender import create_html_email
        
        result = create_html_email()
        assert result == '<html><body>Test Email</body></html>'
        mock_file.assert_called_once()
    
    @patch('builtins.open', new_callable=mock_open, read_data='<html><h1>{{title}}</h1></html>')
    def test_create_html_email_returns_string(self, mock_file):
        """Test that create_html_email returns a string"""
        from services.email.sender import create_html_email
        
        result = create_html_email()
        assert isinstance(result, str)
        assert len(result) > 0
    
    def test_create_html_email_template_exists(self):
        """Test that the email template file exists"""
        from services.email.sender import create_html_email
        import os
        
        # Get the template path
        template_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..',
            'services',
            'email',
            'template.html'
        )
        
        assert os.path.exists(template_path), "Email template file should exist"


class TestSendFormattedEmail:
    """Tests for send_formatted_email function"""
    
    @patch('services.email.sender.smtplib.SMTP')
    @patch('services.email.sender.create_html_email')
    def test_send_email_connects_to_smtp(self, mock_create_html, mock_smtp):
        """Test that send_formatted_email connects to SMTP server"""
        from services.email.sender import send_formatted_email
        
        # Mock the HTML content
        mock_create_html.return_value = '<html><body>Test</body></html>'
        
        # Mock SMTP server
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        send_formatted_email()
        
        # Verify SMTP was called
        mock_smtp.assert_called_once()
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()
        mock_server.send_message.assert_called_once()
    
    @patch('services.email.sender.smtplib.SMTP')
    @patch('services.email.sender.create_html_email')
    def test_send_email_uses_correct_credentials(self, mock_create_html, mock_smtp):
        """Test that send_formatted_email uses correct credentials"""
        from services.email.sender import send_formatted_email
        from services.email.config import SENDER_EMAIL, SENDER_PASSWORD
        
        mock_create_html.return_value = '<html><body>Test</body></html>'
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        send_formatted_email()
        
        # Verify login was called with correct credentials
        mock_server.login.assert_called_once_with(SENDER_EMAIL, SENDER_PASSWORD)
    
    @patch('services.email.sender.smtplib.SMTP')
    @patch('services.email.sender.create_html_email')
    def test_send_email_handles_smtp_error(self, mock_create_html, mock_smtp):
        """Test that send_formatted_email handles SMTP errors gracefully"""
        from services.email.sender import send_formatted_email
        
        mock_create_html.return_value = '<html><body>Test</body></html>'
        
        # Mock SMTP error
        mock_smtp.return_value.__enter__.side_effect = Exception('SMTP connection failed')
        
        # Should not raise exception
        try:
            send_formatted_email()
        except Exception:
            pytest.fail("send_formatted_email should handle exceptions gracefully")
    
    @patch('services.email.sender.smtplib.SMTP')
    @patch('services.email.sender.create_html_email')
    def test_send_email_creates_multipart_message(self, mock_create_html, mock_smtp):
        """Test that send_formatted_email creates a multipart message"""
        from services.email.sender import send_formatted_email
        
        mock_create_html.return_value = '<html><body>Test</body></html>'
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        send_formatted_email()
        
        # Verify send_message was called (which means message was created)
        assert mock_server.send_message.called
        
        # Get the message that was sent
        sent_message = mock_server.send_message.call_args[0][0]
        assert sent_message['From'] == 'Sky Team 5'
        assert 'Subject' in sent_message
        assert '📰 Daily News Digest' in sent_message['Subject']

