using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace CarMonitor.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CarImagesController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<CarImagesController> _logger;

    public CarImagesController(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<CarImagesController> logger)
    {
        _configuration = configuration;
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<CarImageResponse>> GetCarImage([FromQuery] string make, [FromQuery] string model, [FromQuery] int? year)
    {
        var accessKey = _configuration["Unsplash:AccessKey"];

        if (string.IsNullOrEmpty(accessKey))
        {
            _logger.LogWarning("Unsplash API key not configured");
            return Ok(new CarImageResponse { ImageUrl = null });
        }

        try
        {
            var query = $"{make} {model}";
            if (year.HasValue)
            {
                query += $" {year}";
            }
            query += " car";

            var requestUrl = $"https://api.unsplash.com/search/photos?query={Uri.EscapeDataString(query)}&per_page=1&orientation=landscape";

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Client-ID {accessKey}");
            _httpClient.DefaultRequestHeaders.Add("Accept-Version", "v1");

            var response = await _httpClient.GetAsync(requestUrl);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Unsplash API returned {StatusCode}", response.StatusCode);
                return Ok(new CarImageResponse { ImageUrl = null });
            }

            var json = await response.Content.ReadAsStringAsync();
            var searchResult = JsonSerializer.Deserialize<UnsplashSearchResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (searchResult?.Results == null || searchResult.Results.Count == 0)
            {
                return Ok(new CarImageResponse { ImageUrl = null });
            }

            var photo = searchResult.Results[0];
            return Ok(new CarImageResponse
            {
                ImageUrl = photo.Urls?.Regular ?? photo.Urls?.Small,
                Attribution = $"Photo by {photo.User?.Name} on Unsplash",
                PhotographerUrl = photo.User?.Links?.Html
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching car image from Unsplash");
            return Ok(new CarImageResponse { ImageUrl = null });
        }
    }
}

public class CarImageResponse
{
    public string? ImageUrl { get; set; }
    public string? Attribution { get; set; }
    public string? PhotographerUrl { get; set; }
}

public class UnsplashSearchResponse
{
    public int Total { get; set; }
    public int TotalPages { get; set; }
    public List<UnsplashPhoto>? Results { get; set; }
}

public class UnsplashPhoto
{
    public string? Id { get; set; }
    public UnsplashUrls? Urls { get; set; }
    public UnsplashUser? User { get; set; }
}

public class UnsplashUrls
{
    public string? Raw { get; set; }
    public string? Full { get; set; }
    public string? Regular { get; set; }
    public string? Small { get; set; }
    public string? Thumb { get; set; }
}

public class UnsplashUser
{
    public string? Name { get; set; }
    public UnsplashUserLinks? Links { get; set; }
}

public class UnsplashUserLinks
{
    public string? Html { get; set; }
}
