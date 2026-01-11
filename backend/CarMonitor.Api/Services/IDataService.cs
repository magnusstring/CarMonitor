using CarMonitor.Api.Models;

namespace CarMonitor.Api.Services;

public interface IDataService
{
    // Vehicle operations
    List<Vehicle> GetAllVehicles();
    List<Vehicle> GetVehiclesForUser(int userId);
    Vehicle? GetVehicleById(int id);
    bool UserHasAccessToVehicle(int userId, int vehicleId);
    Vehicle CreateVehicle(Vehicle vehicle);
    Vehicle? UpdateVehicle(int id, Vehicle updated);
    bool DeleteVehicle(int id);

    // Reminder operations
    List<Reminder> GetAllReminders();
    List<Reminder> GetRemindersByVehicleId(int vehicleId);
    Reminder? GetReminderById(int id);
    Reminder CreateReminder(Reminder reminder);
    Reminder? UpdateReminder(int id, Reminder updated);
    bool DeleteReminder(int id);

    // User operations
    User? GetUserByUsername(string username);
    User? GetUserById(int id);
    User CreateUser(User user);
    User? UpdateUser(int id, User updated);
    List<User> GetUsersWithEmail();
    List<User> GetUsersWithSmsEnabled();
    List<User> GetAllUsers();

    // ReminderType operations
    List<ReminderTypeEntity> GetAllReminderTypes();
    ReminderTypeEntity? GetReminderTypeById(int id);
    ReminderTypeEntity CreateReminderType(ReminderTypeEntity reminderType);
    ReminderTypeEntity? UpdateReminderType(int id, ReminderTypeEntity updated);
    bool DeleteReminderType(int id);

    // VehicleShare operations
    List<VehicleShare> GetVehicleSharesForUser(int userId);
    List<VehicleShare> GetSharesForVehicle(int vehicleId);
    VehicleShare? ShareVehicle(int vehicleId, int userId);
    bool UnshareVehicle(int vehicleId, int userId);
}
