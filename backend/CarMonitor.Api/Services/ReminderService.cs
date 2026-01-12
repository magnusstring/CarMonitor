using CarMonitor.Api.Models;

namespace CarMonitor.Api.Services;

public class ReminderService
{
    private readonly IDataService _dataService;
    private readonly IEmailService _emailService;
    private readonly ILogger<ReminderService> _logger;

    public ReminderService(IDataService dataService, IEmailService emailService, ILogger<ReminderService> logger)
    {
        _dataService = dataService;
        _emailService = emailService;
        _logger = logger;
    }

    public List<ReminderDto> GetRemindersWithStatus()
    {
        var reminders = _dataService.GetAllReminders();
        var vehicles = _dataService.GetAllVehicles().ToDictionary(v => v.Id);

        return reminders.Select(r => ToDto(r, vehicles.GetValueOrDefault(r.VehicleId))).ToList();
    }

    public List<ReminderDto> GetRemindersByVehicleId(int vehicleId)
    {
        var vehicle = _dataService.GetVehicleById(vehicleId);
        var reminders = _dataService.GetRemindersByVehicleId(vehicleId);

        return reminders.Select(r => ToDto(r, vehicle)).ToList();
    }

    public DashboardResponse GetDashboard()
    {
        var vehicles = _dataService.GetAllVehicles();
        var reminders = GetRemindersWithStatus();

        var now = DateTime.UtcNow;
        var monthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));
        var yearStart = new DateTime(now.Year, 1, 1);

        var overdue = reminders.Where(r => r.Status == "overdue").ToList();
        var upcoming = reminders
            .Where(r => !r.IsCompleted && r.DueDate <= monthEnd && r.DueDate >= now.Date)
            .OrderBy(r => r.DueDate)
            .ToList();

        return new DashboardResponse
        {
            Stats = new DashboardStats
            {
                TotalVehicles = vehicles.Count,
                OverdueReminders = overdue.Count,
                UpcomingThisMonth = upcoming.Count,
                CompletedThisYear = reminders.Count(r => r.IsCompleted)
            },
            OverdueReminders = overdue.OrderBy(r => r.DueDate).ToList(),
            UpcomingReminders = upcoming.Take(10).ToList()
        };
    }

    public async Task SendDailyReminderEmails()
    {
        _logger.LogInformation("Running daily reminder email job");

        var users = _dataService.GetUsersWithEmail();
        if (!users.Any())
        {
            _logger.LogInformation("No users with email configured");
            return;
        }

        var reminders = GetRemindersWithStatus()
            .Where(r => !r.IsCompleted && r.DaysUntilDue <= 7)
            .OrderBy(r => r.DueDate)
            .ToList();

        if (!reminders.Any())
        {
            _logger.LogInformation("No upcoming reminders within 7 days");
            return;
        }

        var html = BuildReminderEmailHtml(reminders);

        foreach (var user in users)
        {
            if (!string.IsNullOrEmpty(user.Email))
            {
                await _emailService.SendEmailAsync(
                    user.Email,
                    $"CarMonitor: {reminders.Count} upcoming reminder(s)",
                    html
                );
            }
        }
    }

    private string BuildReminderEmailHtml(List<ReminderDto> reminders)
    {
        var rows = string.Join("", reminders.Select(r =>
            $@"<tr style='border-bottom: 1px solid #eee;'>
                <td style='padding: 10px;'>{r.VehicleName}</td>
                <td style='padding: 10px;'>{r.Type}</td>
                <td style='padding: 10px;'>{r.DueDate:MMM dd, yyyy}</td>
                <td style='padding: 10px; color: {GetStatusColor(r.Status)};'>{r.Status.ToUpper()}</td>
            </tr>"));

        return $@"
            <html>
            <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <h2 style='color: #333;'>Vehicle Reminders</h2>
                <p>The following reminders are due within the next 7 days:</p>
                <table style='width: 100%; border-collapse: collapse;'>
                    <thead>
                        <tr style='background: #f5f5f5;'>
                            <th style='padding: 10px; text-align: left;'>Vehicle</th>
                            <th style='padding: 10px; text-align: left;'>Type</th>
                            <th style='padding: 10px; text-align: left;'>Due Date</th>
                            <th style='padding: 10px; text-align: left;'>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
                <p style='margin-top: 20px; color: #666;'>
                    Log in to CarMonitor to manage your reminders.
                </p>
            </body>
            </html>";
    }

    private string GetStatusColor(string status) => status switch
    {
        "overdue" => "#dc2626",
        "urgent" => "#ea580c",
        "warning" => "#ca8a04",
        _ => "#16a34a"
    };

    private ReminderDto ToDto(Reminder reminder, Vehicle? vehicle)
    {
        var daysUntilDue = (reminder.DueDate.Date - DateTime.UtcNow.Date).Days;
        var status = reminder.IsCompleted ? "completed" :
                     daysUntilDue < 0 ? "overdue" :
                     daysUntilDue <= 7 ? "urgent" :
                     daysUntilDue <= 30 ? "warning" : "ok";

        return new ReminderDto
        {
            Id = reminder.Id,
            VehicleId = reminder.VehicleId,
            VehicleName = vehicle != null ? $"{vehicle.Make} {vehicle.Model} ({vehicle.LicensePlate})" : "Unknown",
            Type = reminder.Type.ToString(),
            DueDate = reminder.DueDate,
            Notes = reminder.Notes,
            IsCompleted = reminder.IsCompleted,
            DaysUntilDue = daysUntilDue,
            Status = status
        };
    }
}
