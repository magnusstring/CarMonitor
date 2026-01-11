using ClosedXML.Excel;
using CarMonitor.Api.Models;

namespace CarMonitor.Api.Services;

public class ExcelDataService : IDataService
{
    private readonly string _filePath;
    private readonly object _lock = new();

    public ExcelDataService(IConfiguration configuration)
    {
        var dataPath = configuration["DataPath"] ?? "Data";
        Directory.CreateDirectory(dataPath);
        _filePath = Path.Combine(dataPath, "carmonitor.xlsx");
        InitializeWorkbook();
    }

    private void InitializeWorkbook()
    {
        if (File.Exists(_filePath)) return;

        lock (_lock)
        {
            if (File.Exists(_filePath)) return;

            using var workbook = new XLWorkbook();

            // Vehicles sheet
            var vehiclesSheet = workbook.Worksheets.Add("Vehicles");
            vehiclesSheet.Cell(1, 1).Value = "Id";
            vehiclesSheet.Cell(1, 2).Value = "Make";
            vehiclesSheet.Cell(1, 3).Value = "Model";
            vehiclesSheet.Cell(1, 4).Value = "Year";
            vehiclesSheet.Cell(1, 5).Value = "LicensePlate";
            vehiclesSheet.Cell(1, 6).Value = "Vin";
            vehiclesSheet.Cell(1, 7).Value = "Color";
            vehiclesSheet.Cell(1, 8).Value = "Notes";
            vehiclesSheet.Cell(1, 9).Value = "CreatedAt";
            vehiclesSheet.Cell(1, 10).Value = "UserId";

            // VehicleShares sheet
            var sharesSheet = workbook.Worksheets.Add("VehicleShares");
            sharesSheet.Cell(1, 1).Value = "Id";
            sharesSheet.Cell(1, 2).Value = "VehicleId";
            sharesSheet.Cell(1, 3).Value = "UserId";
            sharesSheet.Cell(1, 4).Value = "SharedAt";

            // Reminders sheet
            var remindersSheet = workbook.Worksheets.Add("Reminders");
            remindersSheet.Cell(1, 1).Value = "Id";
            remindersSheet.Cell(1, 2).Value = "VehicleId";
            remindersSheet.Cell(1, 3).Value = "Type";
            remindersSheet.Cell(1, 4).Value = "DueDate";
            remindersSheet.Cell(1, 5).Value = "Notes";
            remindersSheet.Cell(1, 6).Value = "IsCompleted";
            remindersSheet.Cell(1, 7).Value = "CreatedAt";

            // Users sheet
            var usersSheet = workbook.Worksheets.Add("Users");
            usersSheet.Cell(1, 1).Value = "Id";
            usersSheet.Cell(1, 2).Value = "Username";
            usersSheet.Cell(1, 3).Value = "PasswordHash";
            usersSheet.Cell(1, 4).Value = "Email";
            usersSheet.Cell(1, 5).Value = "CreatedAt";

            // ReminderTypes sheet
            var reminderTypesSheet = workbook.Worksheets.Add("ReminderTypes");
            reminderTypesSheet.Cell(1, 1).Value = "Id";
            reminderTypesSheet.Cell(1, 2).Value = "Name";
            reminderTypesSheet.Cell(1, 3).Value = "Icon";
            reminderTypesSheet.Cell(1, 4).Value = "Color";
            reminderTypesSheet.Cell(1, 5).Value = "IsDefault";
            reminderTypesSheet.Cell(1, 6).Value = "CreatedAt";

            // Add default reminder types
            var now = DateTime.UtcNow;
            reminderTypesSheet.Cell(2, 1).Value = 1;
            reminderTypesSheet.Cell(2, 2).Value = "Insurance";
            reminderTypesSheet.Cell(2, 3).Value = "insurance";
            reminderTypesSheet.Cell(2, 4).Value = "#3b82f6";
            reminderTypesSheet.Cell(2, 5).Value = true;
            reminderTypesSheet.Cell(2, 6).Value = now;

            reminderTypesSheet.Cell(3, 1).Value = 2;
            reminderTypesSheet.Cell(3, 2).Value = "Inspection";
            reminderTypesSheet.Cell(3, 3).Value = "inspection";
            reminderTypesSheet.Cell(3, 4).Value = "#10b981";
            reminderTypesSheet.Cell(3, 5).Value = true;
            reminderTypesSheet.Cell(3, 6).Value = now;

            reminderTypesSheet.Cell(4, 1).Value = 3;
            reminderTypesSheet.Cell(4, 2).Value = "RoadTax";
            reminderTypesSheet.Cell(4, 3).Value = "roadtax";
            reminderTypesSheet.Cell(4, 4).Value = "#f59e0b";
            reminderTypesSheet.Cell(4, 5).Value = true;
            reminderTypesSheet.Cell(4, 6).Value = now;

            workbook.SaveAs(_filePath);
        }
    }

    // Vehicle operations
    public List<Vehicle> GetAllVehicles()
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Vehicles");
            var vehicles = new List<Vehicle>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                var userIdCell = row.Cell(10);
                vehicles.Add(new Vehicle
                {
                    Id = row.Cell(1).GetValue<int>(),
                    Make = row.Cell(2).GetString(),
                    Model = row.Cell(3).GetString(),
                    Year = row.Cell(4).GetValue<int>(),
                    LicensePlate = row.Cell(5).GetString(),
                    Vin = row.Cell(6).GetString(),
                    Color = row.Cell(7).GetString(),
                    Notes = row.Cell(8).GetString(),
                    CreatedAt = row.Cell(9).GetDateTime(),
                    UserId = userIdCell.IsEmpty() ? 0 : userIdCell.GetValue<int>()
                });
            }

            return vehicles;
        }
    }

    public List<Vehicle> GetVehiclesForUser(int userId)
    {
        var allVehicles = GetAllVehicles();
        var sharedVehicleIds = GetVehicleSharesForUser(userId).Select(s => s.VehicleId).ToHashSet();

        return allVehicles
            .Where(v => v.UserId == userId || v.UserId == 0 || sharedVehicleIds.Contains(v.Id))
            .ToList();
    }

    public Vehicle? GetVehicleById(int id)
    {
        return GetAllVehicles().FirstOrDefault(v => v.Id == id);
    }

    public bool UserHasAccessToVehicle(int userId, int vehicleId)
    {
        var vehicle = GetVehicleById(vehicleId);
        if (vehicle == null) return false;
        if (vehicle.UserId == userId || vehicle.UserId == 0) return true;
        return GetVehicleSharesForUser(userId).Any(s => s.VehicleId == vehicleId);
    }

    public Vehicle CreateVehicle(Vehicle vehicle)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Vehicles");

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            var newId = lastRow == 1 ? 1 : sheet.Cell(lastRow, 1).GetValue<int>() + 1;

            vehicle.Id = newId;
            vehicle.CreatedAt = DateTime.UtcNow;

            var newRow = lastRow + 1;
            sheet.Cell(newRow, 1).Value = vehicle.Id;
            sheet.Cell(newRow, 2).Value = vehicle.Make;
            sheet.Cell(newRow, 3).Value = vehicle.Model;
            sheet.Cell(newRow, 4).Value = vehicle.Year;
            sheet.Cell(newRow, 5).Value = vehicle.LicensePlate;
            sheet.Cell(newRow, 6).Value = vehicle.Vin ?? "";
            sheet.Cell(newRow, 7).Value = vehicle.Color ?? "";
            sheet.Cell(newRow, 8).Value = vehicle.Notes ?? "";
            sheet.Cell(newRow, 9).Value = vehicle.CreatedAt;
            sheet.Cell(newRow, 10).Value = vehicle.UserId;

            workbook.Save();
            return vehicle;
        }
    }

    public Vehicle? UpdateVehicle(int id, Vehicle updated)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Vehicles");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    row.Cell(2).Value = updated.Make;
                    row.Cell(3).Value = updated.Model;
                    row.Cell(4).Value = updated.Year;
                    row.Cell(5).Value = updated.LicensePlate;
                    row.Cell(6).Value = updated.Vin ?? "";
                    row.Cell(7).Value = updated.Color ?? "";
                    row.Cell(8).Value = updated.Notes ?? "";
                    workbook.Save();

                    updated.Id = id;
                    updated.CreatedAt = row.Cell(9).GetDateTime();
                    return updated;
                }
            }
            return null;
        }
    }

    public bool DeleteVehicle(int id)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Vehicles");

            var rows = sheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    row.Delete();
                    workbook.Save();

                    // Also delete associated reminders
                    DeleteRemindersByVehicleId(id);
                    return true;
                }
            }
            return false;
        }
    }

    // Reminder operations
    public List<Reminder> GetAllReminders()
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Reminders");
            var reminders = new List<Reminder>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                reminders.Add(new Reminder
                {
                    Id = row.Cell(1).GetValue<int>(),
                    VehicleId = row.Cell(2).GetValue<int>(),
                    Type = row.Cell(3).GetString(),
                    DueDate = row.Cell(4).GetDateTime(),
                    Notes = row.Cell(5).GetString(),
                    IsCompleted = row.Cell(6).GetValue<bool>(),
                    CreatedAt = row.Cell(7).GetDateTime()
                });
            }

            return reminders;
        }
    }

    public List<Reminder> GetRemindersByVehicleId(int vehicleId)
    {
        return GetAllReminders().Where(r => r.VehicleId == vehicleId).ToList();
    }

    public Reminder? GetReminderById(int id)
    {
        return GetAllReminders().FirstOrDefault(r => r.Id == id);
    }

    public Reminder CreateReminder(Reminder reminder)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Reminders");

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            var newId = lastRow == 1 ? 1 : sheet.Cell(lastRow, 1).GetValue<int>() + 1;

            reminder.Id = newId;
            reminder.CreatedAt = DateTime.UtcNow;

            var newRow = lastRow + 1;
            sheet.Cell(newRow, 1).Value = reminder.Id;
            sheet.Cell(newRow, 2).Value = reminder.VehicleId;
            sheet.Cell(newRow, 3).Value = reminder.Type;
            sheet.Cell(newRow, 4).Value = reminder.DueDate;
            sheet.Cell(newRow, 5).Value = reminder.Notes ?? "";
            sheet.Cell(newRow, 6).Value = reminder.IsCompleted;
            sheet.Cell(newRow, 7).Value = reminder.CreatedAt;

            workbook.Save();
            return reminder;
        }
    }

    public Reminder? UpdateReminder(int id, Reminder updated)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Reminders");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    row.Cell(4).Value = updated.DueDate;
                    row.Cell(5).Value = updated.Notes ?? "";
                    row.Cell(6).Value = updated.IsCompleted;
                    workbook.Save();

                    updated.Id = id;
                    updated.VehicleId = row.Cell(2).GetValue<int>();
                    updated.Type = row.Cell(3).GetString();
                    updated.CreatedAt = row.Cell(7).GetDateTime();
                    return updated;
                }
            }
            return null;
        }
    }

    public bool DeleteReminder(int id)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Reminders");

            var rows = sheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    row.Delete();
                    workbook.Save();
                    return true;
                }
            }
            return false;
        }
    }

    private void DeleteRemindersByVehicleId(int vehicleId)
    {
        using var workbook = new XLWorkbook(_filePath);
        var sheet = workbook.Worksheet("Reminders");

        var rowsToDelete = sheet.RowsUsed().Skip(1)
            .Where(row => row.Cell(2).GetValue<int>() == vehicleId)
            .ToList();

        foreach (var row in rowsToDelete)
        {
            row.Delete();
        }
        workbook.Save();
    }

    // User operations
    public User? GetUserByUsername(string username)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Users");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(2).GetString().Equals(username, StringComparison.OrdinalIgnoreCase))
                {
                    return new User
                    {
                        Id = row.Cell(1).GetValue<int>(),
                        Username = row.Cell(2).GetString(),
                        PasswordHash = row.Cell(3).GetString(),
                        Email = row.Cell(4).GetString(),
                        CreatedAt = row.Cell(5).GetDateTime()
                    };
                }
            }
            return null;
        }
    }

    public User CreateUser(User user)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Users");

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            var newId = lastRow == 1 ? 1 : sheet.Cell(lastRow, 1).GetValue<int>() + 1;

            user.Id = newId;
            user.CreatedAt = DateTime.UtcNow;

            var newRow = lastRow + 1;
            sheet.Cell(newRow, 1).Value = user.Id;
            sheet.Cell(newRow, 2).Value = user.Username;
            sheet.Cell(newRow, 3).Value = user.PasswordHash;
            sheet.Cell(newRow, 4).Value = user.Email ?? "";
            sheet.Cell(newRow, 5).Value = user.CreatedAt;

            workbook.Save();
            return user;
        }
    }

    public List<User> GetUsersWithEmail()
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Users");
            var users = new List<User>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                var email = row.Cell(4).GetString();
                if (!string.IsNullOrEmpty(email))
                {
                    users.Add(new User
                    {
                        Id = row.Cell(1).GetValue<int>(),
                        Username = row.Cell(2).GetString(),
                        Email = email,
                        CreatedAt = row.Cell(5).GetDateTime()
                    });
                }
            }
            return users;
        }
    }

    // ReminderType operations
    public List<ReminderTypeEntity> GetAllReminderTypes()
    {
        lock (_lock)
        {
            // Always start with default types
            var types = GetDefaultReminderTypes();

            using var workbook = new XLWorkbook(_filePath);

            // Check if sheet exists
            if (!workbook.Worksheets.Contains("ReminderTypes"))
            {
                return types;
            }

            var sheet = workbook.Worksheet("ReminderTypes");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                var dbType = new ReminderTypeEntity
                {
                    Id = row.Cell(1).GetValue<int>(),
                    Name = row.Cell(2).GetString(),
                    Icon = row.Cell(3).GetString(),
                    Color = row.Cell(4).GetString(),
                    IsDefault = row.Cell(5).GetValue<bool>(),
                    CreatedAt = row.Cell(6).GetDateTime()
                };

                // Add custom types (non-default) that aren't already in the list
                if (!dbType.IsDefault && !types.Any(t => t.Name.Equals(dbType.Name, StringComparison.OrdinalIgnoreCase)))
                {
                    types.Add(dbType);
                }
            }

            return types;
        }
    }

    private List<ReminderTypeEntity> GetDefaultReminderTypes()
    {
        return new List<ReminderTypeEntity>
        {
            new() { Id = 1, Name = "Insurance", Icon = "insurance", Color = "#3b82f6", IsDefault = true },
            new() { Id = 2, Name = "Inspection", Icon = "inspection", Color = "#10b981", IsDefault = true },
            new() { Id = 3, Name = "RoadTax", Icon = "roadtax", Color = "#f59e0b", IsDefault = true }
        };
    }

    public ReminderTypeEntity? GetReminderTypeById(int id)
    {
        return GetAllReminderTypes().FirstOrDefault(t => t.Id == id);
    }

    public ReminderTypeEntity CreateReminderType(ReminderTypeEntity reminderType)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);

            // Ensure sheet exists
            IXLWorksheet sheet;
            if (!workbook.Worksheets.Contains("ReminderTypes"))
            {
                sheet = workbook.Worksheets.Add("ReminderTypes");
                sheet.Cell(1, 1).Value = "Id";
                sheet.Cell(1, 2).Value = "Name";
                sheet.Cell(1, 3).Value = "Icon";
                sheet.Cell(1, 4).Value = "Color";
                sheet.Cell(1, 5).Value = "IsDefault";
                sheet.Cell(1, 6).Value = "CreatedAt";
            }
            else
            {
                sheet = workbook.Worksheet("ReminderTypes");
            }

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            var newId = lastRow == 1 ? 1 : sheet.Cell(lastRow, 1).GetValue<int>() + 1;

            reminderType.Id = newId;
            reminderType.CreatedAt = DateTime.UtcNow;
            reminderType.IsDefault = false;

            var newRow = lastRow + 1;
            sheet.Cell(newRow, 1).Value = reminderType.Id;
            sheet.Cell(newRow, 2).Value = reminderType.Name;
            sheet.Cell(newRow, 3).Value = reminderType.Icon;
            sheet.Cell(newRow, 4).Value = reminderType.Color;
            sheet.Cell(newRow, 5).Value = reminderType.IsDefault;
            sheet.Cell(newRow, 6).Value = reminderType.CreatedAt;

            workbook.Save();
            return reminderType;
        }
    }

    public ReminderTypeEntity? UpdateReminderType(int id, ReminderTypeEntity updated)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            if (!workbook.Worksheets.Contains("ReminderTypes")) return null;

            var sheet = workbook.Worksheet("ReminderTypes");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    row.Cell(2).Value = updated.Name;
                    row.Cell(3).Value = updated.Icon;
                    row.Cell(4).Value = updated.Color;
                    workbook.Save();

                    updated.Id = id;
                    updated.IsDefault = row.Cell(5).GetValue<bool>();
                    updated.CreatedAt = row.Cell(6).GetDateTime();
                    return updated;
                }
            }
            return null;
        }
    }

    public bool DeleteReminderType(int id)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            if (!workbook.Worksheets.Contains("ReminderTypes")) return false;

            var sheet = workbook.Worksheet("ReminderTypes");

            var rows = sheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    // Don't allow deleting default types
                    if (row.Cell(5).GetValue<bool>()) return false;

                    row.Delete();
                    workbook.Save();
                    return true;
                }
            }
            return false;
        }
    }

    // User by ID
    public User? GetUserById(int id)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Users");

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(1).GetValue<int>() == id)
                {
                    return new User
                    {
                        Id = row.Cell(1).GetValue<int>(),
                        Username = row.Cell(2).GetString(),
                        Email = row.Cell(4).GetString(),
                        CreatedAt = row.Cell(5).GetDateTime()
                    };
                }
            }
            return null;
        }
    }

    public List<User> GetAllUsers()
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            var sheet = workbook.Worksheet("Users");
            var users = new List<User>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                users.Add(new User
                {
                    Id = row.Cell(1).GetValue<int>(),
                    Username = row.Cell(2).GetString(),
                    Email = row.Cell(4).GetString(),
                    CreatedAt = row.Cell(5).GetDateTime()
                });
            }
            return users;
        }
    }

    // VehicleShare operations
    public List<VehicleShare> GetVehicleSharesForUser(int userId)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            if (!workbook.Worksheets.Contains("VehicleShares"))
            {
                return new List<VehicleShare>();
            }

            var sheet = workbook.Worksheet("VehicleShares");
            var shares = new List<VehicleShare>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(3).GetValue<int>() == userId)
                {
                    shares.Add(new VehicleShare
                    {
                        Id = row.Cell(1).GetValue<int>(),
                        VehicleId = row.Cell(2).GetValue<int>(),
                        UserId = row.Cell(3).GetValue<int>(),
                        SharedAt = row.Cell(4).GetDateTime()
                    });
                }
            }
            return shares;
        }
    }

    public List<VehicleShare> GetSharesForVehicle(int vehicleId)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            if (!workbook.Worksheets.Contains("VehicleShares"))
            {
                return new List<VehicleShare>();
            }

            var sheet = workbook.Worksheet("VehicleShares");
            var shares = new List<VehicleShare>();

            var rows = sheet.RowsUsed().Skip(1);
            foreach (var row in rows)
            {
                if (row.Cell(2).GetValue<int>() == vehicleId)
                {
                    shares.Add(new VehicleShare
                    {
                        Id = row.Cell(1).GetValue<int>(),
                        VehicleId = row.Cell(2).GetValue<int>(),
                        UserId = row.Cell(3).GetValue<int>(),
                        SharedAt = row.Cell(4).GetDateTime()
                    });
                }
            }
            return shares;
        }
    }

    public VehicleShare? ShareVehicle(int vehicleId, int userId)
    {
        // Check if already shared
        var existing = GetSharesForVehicle(vehicleId);
        if (existing.Any(s => s.UserId == userId))
        {
            return existing.First(s => s.UserId == userId);
        }

        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);

            IXLWorksheet sheet;
            if (!workbook.Worksheets.Contains("VehicleShares"))
            {
                sheet = workbook.Worksheets.Add("VehicleShares");
                sheet.Cell(1, 1).Value = "Id";
                sheet.Cell(1, 2).Value = "VehicleId";
                sheet.Cell(1, 3).Value = "UserId";
                sheet.Cell(1, 4).Value = "SharedAt";
            }
            else
            {
                sheet = workbook.Worksheet("VehicleShares");
            }

            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
            var newId = lastRow == 1 ? 1 : sheet.Cell(lastRow, 1).GetValue<int>() + 1;

            var share = new VehicleShare
            {
                Id = newId,
                VehicleId = vehicleId,
                UserId = userId,
                SharedAt = DateTime.UtcNow
            };

            var newRow = lastRow + 1;
            sheet.Cell(newRow, 1).Value = share.Id;
            sheet.Cell(newRow, 2).Value = share.VehicleId;
            sheet.Cell(newRow, 3).Value = share.UserId;
            sheet.Cell(newRow, 4).Value = share.SharedAt;

            workbook.Save();
            return share;
        }
    }

    public bool UnshareVehicle(int vehicleId, int userId)
    {
        lock (_lock)
        {
            using var workbook = new XLWorkbook(_filePath);
            if (!workbook.Worksheets.Contains("VehicleShares")) return false;

            var sheet = workbook.Worksheet("VehicleShares");

            var rows = sheet.RowsUsed().Skip(1).ToList();
            foreach (var row in rows)
            {
                if (row.Cell(2).GetValue<int>() == vehicleId && row.Cell(3).GetValue<int>() == userId)
                {
                    row.Delete();
                    workbook.Save();
                    return true;
                }
            }
            return false;
        }
    }
}
