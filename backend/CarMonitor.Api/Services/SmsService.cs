using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace CarMonitor.Api.Services;

public class SmsService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmsService> _logger;
    private readonly bool _isConfigured;

    public SmsService(IConfiguration configuration, ILogger<SmsService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        var accountSid = _configuration["Twilio:AccountSid"];
        var authToken = _configuration["Twilio:AuthToken"];

        if (!string.IsNullOrEmpty(accountSid) && !string.IsNullOrEmpty(authToken))
        {
            TwilioClient.Init(accountSid, authToken);
            _isConfigured = true;
            _logger.LogInformation("Twilio SMS service initialized");
        }
        else
        {
            _isConfigured = false;
            _logger.LogWarning("Twilio SMS service not configured - missing AccountSid or AuthToken");
        }
    }

    public async Task<bool> SendSmsAsync(string toPhoneNumber, string message)
    {
        if (!_isConfigured)
        {
            _logger.LogWarning("SMS not sent - Twilio not configured");
            return false;
        }

        var fromNumber = _configuration["Twilio:FromNumber"];
        if (string.IsNullOrEmpty(fromNumber))
        {
            _logger.LogWarning("SMS not sent - Twilio FromNumber not configured");
            return false;
        }

        try
        {
            var messageResource = await MessageResource.CreateAsync(
                to: new PhoneNumber(toPhoneNumber),
                from: new PhoneNumber(fromNumber),
                body: message
            );

            _logger.LogInformation("SMS sent to {PhoneNumber}, SID: {MessageSid}", toPhoneNumber, messageResource.Sid);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send SMS to {PhoneNumber}", toPhoneNumber);
            return false;
        }
    }

    public bool IsConfigured => _isConfigured;
}
