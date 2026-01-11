using CarMonitor.Api.Data;
using CarMonitor.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarMonitor.Api.Services;

public class DbDataService : IDataService
{
    private readonly CarMonitorDbContext _context;

    public DbDataService(CarMonitorDbContext context)
    {
        _context = context;
    }

    // Vehicle operations
    public List<Vehicle> GetAllVehicles()
    {
        return _context.Vehicles.ToList();
    }

    public List<Vehicle> GetVehiclesForUser(int userId)
    {
        var sharedVehicleIds = _context.VehicleShares
            .Where(s => s.UserId == userId)
            .Select(s => s.VehicleId)
            .ToHashSet();

        return _context.Vehicles
            .Where(v => v.UserId == userId || v.UserId == 0 || sharedVehicleIds.Contains(v.Id))
            .ToList();
    }

    public Vehicle? GetVehicleById(int id)
    {
        return _context.Vehicles.FirstOrDefault(v => v.Id == id);
    }

    public bool UserHasAccessToVehicle(int userId, int vehicleId)
    {
        var vehicle = GetVehicleById(vehicleId);
        if (vehicle == null) return false;
        if (vehicle.UserId == userId || vehicle.UserId == 0) return true;
        return _context.VehicleShares.Any(s => s.VehicleId == vehicleId && s.UserId == userId);
    }

    public Vehicle CreateVehicle(Vehicle vehicle)
    {
        vehicle.CreatedAt = DateTime.UtcNow;
        _context.Vehicles.Add(vehicle);
        _context.SaveChanges();
        return vehicle;
    }

    public Vehicle? UpdateVehicle(int id, Vehicle updated)
    {
        var existing = _context.Vehicles.FirstOrDefault(v => v.Id == id);
        if (existing == null) return null;

        existing.Make = updated.Make;
        existing.Model = updated.Model;
        existing.Year = updated.Year;
        existing.LicensePlate = updated.LicensePlate;
        existing.Vin = updated.Vin;
        existing.Color = updated.Color;
        existing.Notes = updated.Notes;

        _context.SaveChanges();
        return existing;
    }

    public bool DeleteVehicle(int id)
    {
        var vehicle = _context.Vehicles.FirstOrDefault(v => v.Id == id);
        if (vehicle == null) return false;

        // Delete associated reminders
        var reminders = _context.Reminders.Where(r => r.VehicleId == id);
        _context.Reminders.RemoveRange(reminders);

        // Delete shares
        var shares = _context.VehicleShares.Where(s => s.VehicleId == id);
        _context.VehicleShares.RemoveRange(shares);

        _context.Vehicles.Remove(vehicle);
        _context.SaveChanges();
        return true;
    }

    // Reminder operations
    public List<Reminder> GetAllReminders()
    {
        return _context.Reminders.ToList();
    }

    public List<Reminder> GetRemindersByVehicleId(int vehicleId)
    {
        return _context.Reminders.Where(r => r.VehicleId == vehicleId).ToList();
    }

    public Reminder? GetReminderById(int id)
    {
        return _context.Reminders.FirstOrDefault(r => r.Id == id);
    }

    public Reminder CreateReminder(Reminder reminder)
    {
        reminder.CreatedAt = DateTime.UtcNow;
        _context.Reminders.Add(reminder);
        _context.SaveChanges();
        return reminder;
    }

    public Reminder? UpdateReminder(int id, Reminder updated)
    {
        var existing = _context.Reminders.FirstOrDefault(r => r.Id == id);
        if (existing == null) return null;

        existing.DueDate = updated.DueDate;
        existing.Notes = updated.Notes;
        existing.IsCompleted = updated.IsCompleted;

        _context.SaveChanges();
        return existing;
    }

    public bool DeleteReminder(int id)
    {
        var reminder = _context.Reminders.FirstOrDefault(r => r.Id == id);
        if (reminder == null) return false;

        _context.Reminders.Remove(reminder);
        _context.SaveChanges();
        return true;
    }

    // User operations
    public User? GetUserByUsername(string username)
    {
        return _context.Users.FirstOrDefault(u => u.Username.ToLower() == username.ToLower());
    }

    public User? GetUserById(int id)
    {
        return _context.Users.FirstOrDefault(u => u.Id == id);
    }

    public User CreateUser(User user)
    {
        user.CreatedAt = DateTime.UtcNow;
        _context.Users.Add(user);
        _context.SaveChanges();
        return user;
    }

    public List<User> GetUsersWithEmail()
    {
        return _context.Users.Where(u => !string.IsNullOrEmpty(u.Email)).ToList();
    }

    public List<User> GetAllUsers()
    {
        return _context.Users.ToList();
    }

    // ReminderType operations
    public List<ReminderTypeEntity> GetAllReminderTypes()
    {
        return _context.ReminderTypes.ToList();
    }

    public ReminderTypeEntity? GetReminderTypeById(int id)
    {
        return _context.ReminderTypes.FirstOrDefault(t => t.Id == id);
    }

    public ReminderTypeEntity CreateReminderType(ReminderTypeEntity reminderType)
    {
        reminderType.CreatedAt = DateTime.UtcNow;
        reminderType.IsDefault = false;
        _context.ReminderTypes.Add(reminderType);
        _context.SaveChanges();
        return reminderType;
    }

    public ReminderTypeEntity? UpdateReminderType(int id, ReminderTypeEntity updated)
    {
        var existing = _context.ReminderTypes.FirstOrDefault(t => t.Id == id);
        if (existing == null) return null;

        existing.Name = updated.Name;
        existing.Icon = updated.Icon;
        existing.Color = updated.Color;

        _context.SaveChanges();
        return existing;
    }

    public bool DeleteReminderType(int id)
    {
        var reminderType = _context.ReminderTypes.FirstOrDefault(t => t.Id == id);
        if (reminderType == null || reminderType.IsDefault) return false;

        _context.ReminderTypes.Remove(reminderType);
        _context.SaveChanges();
        return true;
    }

    // VehicleShare operations
    public List<VehicleShare> GetVehicleSharesForUser(int userId)
    {
        return _context.VehicleShares.Where(s => s.UserId == userId).ToList();
    }

    public List<VehicleShare> GetSharesForVehicle(int vehicleId)
    {
        return _context.VehicleShares.Where(s => s.VehicleId == vehicleId).ToList();
    }

    public VehicleShare? ShareVehicle(int vehicleId, int userId)
    {
        var existing = _context.VehicleShares.FirstOrDefault(s => s.VehicleId == vehicleId && s.UserId == userId);
        if (existing != null) return existing;

        var share = new VehicleShare
        {
            VehicleId = vehicleId,
            UserId = userId,
            SharedAt = DateTime.UtcNow
        };

        _context.VehicleShares.Add(share);
        _context.SaveChanges();
        return share;
    }

    public bool UnshareVehicle(int vehicleId, int userId)
    {
        var share = _context.VehicleShares.FirstOrDefault(s => s.VehicleId == vehicleId && s.UserId == userId);
        if (share == null) return false;

        _context.VehicleShares.Remove(share);
        _context.SaveChanges();
        return true;
    }
}
