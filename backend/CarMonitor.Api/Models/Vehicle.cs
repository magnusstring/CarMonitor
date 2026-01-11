namespace CarMonitor.Api.Models;

public class Vehicle
{
    public int Id { get; set; }
    public int UserId { get; set; } // Owner
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string? Vin { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class VehicleShare
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public int UserId { get; set; } // User who has access
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;
}

public class VehicleDto
{
    public int Id { get; set; }
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string? Vin { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
    public bool IsOwner { get; set; }
    public string? OwnerName { get; set; }
    public List<SharedUserDto> SharedWith { get; set; } = new();
}

public class SharedUserDto
{
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
}

public class CreateVehicleRequest
{
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string? Vin { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }
}

public class ShareVehicleRequest
{
    public string Username { get; set; } = string.Empty;
}
