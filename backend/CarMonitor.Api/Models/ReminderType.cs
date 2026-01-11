namespace CarMonitor.Api.Models;

public class ReminderTypeEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "default"; // insurance, inspection, roadtax, default
    public string Color { get; set; } = "#6366f1"; // hex color
    public bool IsDefault { get; set; } // system default types can't be deleted
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReminderTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "default";
    public string Color { get; set; } = "#6366f1";
    public bool IsDefault { get; set; }
}

public class CreateReminderTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = "default";
    public string Color { get; set; } = "#6366f1";
}
