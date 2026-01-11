namespace CarMonitor.Api.Models;

public class DashboardStats
{
    public int TotalVehicles { get; set; }
    public int OverdueReminders { get; set; }
    public int UpcomingThisMonth { get; set; }
    public int CompletedThisYear { get; set; }
}

public class DashboardResponse
{
    public DashboardStats Stats { get; set; } = new();
    public List<ReminderDto> UpcomingReminders { get; set; } = new();
    public List<ReminderDto> OverdueReminders { get; set; } = new();
}
