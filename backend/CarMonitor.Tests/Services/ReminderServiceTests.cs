using CarMonitor.Api.Models;
using CarMonitor.Api.Services;
using Microsoft.Extensions.Logging;
using Moq;

namespace CarMonitor.Tests.Services;

public class ReminderServiceTests
{
    private readonly Mock<IDataService> _dataServiceMock;
    private readonly Mock<EmailService> _emailServiceMock;
    private readonly Mock<ILogger<ReminderService>> _loggerMock;
    private readonly ReminderService _reminderService;

    public ReminderServiceTests()
    {
        _dataServiceMock = new Mock<IDataService>();
        _emailServiceMock = new Mock<EmailService>();
        _loggerMock = new Mock<ILogger<ReminderService>>();
        _reminderService = new ReminderService(
            _dataServiceMock.Object,
            _emailServiceMock.Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectStatus_WhenOverdue()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(-5), // 5 days overdue
            IsCompleted = false
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("overdue", result[0].Status);
        Assert.Equal(-5, result[0].DaysUntilDue);
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectStatus_WhenUrgent()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(3), // 3 days until due (urgent: <= 7 days)
            IsCompleted = false
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("urgent", result[0].Status);
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectStatus_WhenWarning()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(15), // 15 days until due (warning: <= 30 days)
            IsCompleted = false
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("warning", result[0].Status);
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectStatus_WhenOk()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(60), // 60 days until due (ok: > 30 days)
            IsCompleted = false
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("ok", result[0].Status);
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectStatus_WhenCompleted()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(-5), // Would be overdue but is completed
            IsCompleted = true
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("completed", result[0].Status);
    }

    [Fact]
    public void GetRemindersWithStatus_ReturnsCorrectVehicleName()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminder = new Reminder
        {
            Id = 1,
            VehicleId = 1,
            Type = "Insurance",
            DueDate = DateTime.UtcNow.AddDays(30),
            IsCompleted = false
        };

        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(new List<Reminder> { reminder });
        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(new List<Vehicle> { vehicle });

        // Act
        var result = _reminderService.GetRemindersWithStatus();

        // Assert
        Assert.Single(result);
        Assert.Equal("Toyota Camry (ABC123)", result[0].VehicleName);
    }

    [Fact]
    public void GetRemindersByVehicleId_ReturnsOnlyVehicleReminders()
    {
        // Arrange
        var vehicle = new Vehicle { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 };
        var reminders = new List<Reminder>
        {
            new() { Id = 1, VehicleId = 1, Type = "Insurance", DueDate = DateTime.UtcNow.AddDays(30) },
            new() { Id = 2, VehicleId = 1, Type = "Inspection", DueDate = DateTime.UtcNow.AddDays(60) }
        };

        _dataServiceMock.Setup(x => x.GetVehicleById(1)).Returns(vehicle);
        _dataServiceMock.Setup(x => x.GetRemindersByVehicleId(1)).Returns(reminders);

        // Act
        var result = _reminderService.GetRemindersByVehicleId(1);

        // Assert
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void GetDashboard_ReturnsCorrectStats()
    {
        // Arrange
        var vehicles = new List<Vehicle>
        {
            new() { Id = 1, Make = "Toyota", Model = "Camry", LicensePlate = "ABC123", UserId = 1 },
            new() { Id = 2, Make = "Honda", Model = "Civic", LicensePlate = "XYZ789", UserId = 1 }
        };

        var reminders = new List<Reminder>
        {
            new() { Id = 1, VehicleId = 1, Type = "Insurance", DueDate = DateTime.UtcNow.AddDays(-5), IsCompleted = false }, // overdue
            new() { Id = 2, VehicleId = 1, Type = "Inspection", DueDate = DateTime.UtcNow.AddDays(5), IsCompleted = false }, // upcoming
            new() { Id = 3, VehicleId = 2, Type = "RoadTax", DueDate = DateTime.UtcNow.AddDays(10), IsCompleted = true } // completed
        };

        _dataServiceMock.Setup(x => x.GetAllVehicles()).Returns(vehicles);
        _dataServiceMock.Setup(x => x.GetAllReminders()).Returns(reminders);

        // Act
        var result = _reminderService.GetDashboard();

        // Assert
        Assert.Equal(2, result.Stats.TotalVehicles);
        Assert.Equal(1, result.Stats.OverdueReminders);
        Assert.Equal(1, result.Stats.CompletedThisYear);
    }
}
