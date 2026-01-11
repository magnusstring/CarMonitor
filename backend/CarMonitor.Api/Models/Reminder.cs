namespace CarMonitor.Api.Models;

public class Reminder
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReminderDto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string VehicleName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }
    public int DaysUntilDue { get; set; }
    public string Status { get; set; } = string.Empty; // overdue, urgent, warning, ok, completed
}

public class CreateReminderRequest
{
    public int VehicleId { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string? Notes { get; set; }
}

public class UpdateReminderRequest
{
    public DateTime DueDate { get; set; }
    public string? Notes { get; set; }
    public bool IsCompleted { get; set; }
}
