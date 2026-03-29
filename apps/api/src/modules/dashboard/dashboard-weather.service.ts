import { Injectable, Logger } from '@nestjs/common';
import type { WeatherProviderHealth } from '@bakki/domain';
import { BakkiGeometryService } from '../../bakki-core/bakki-geometry.service';

interface OpenMeteoCurrentResponse {
  current?: {
    temperature_2m?: number | null;
    weather_code?: number | null;
    wind_direction_10m?: number | null;
    wind_speed_10m?: number | null;
  };
}

export interface DashboardConditionsSummary {
  conditionsCopy: string;
  conditionsValue: string;
}

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

@Injectable()
export class DashboardWeatherService {
  private readonly logger = new Logger(DashboardWeatherService.name);

  constructor(private readonly bakkiGeometry: BakkiGeometryService) {}

  async getCurrentConditions(): Promise<DashboardConditionsSummary | null> {
    const health = await this.getHealthStatus();
    if (!health.available || !health.conditionsValue || !health.conditionsCopy) {
      return null;
    }

    return {
      conditionsValue: health.conditionsValue,
      conditionsCopy: health.conditionsCopy,
    };
  }

  async getHealthStatus(): Promise<WeatherProviderHealth> {
    const checkedAt = new Date().toISOString();
    const coordinates = await this.bakkiGeometry.getRanchCentroidCoordinates();
    if (!coordinates) {
      return {
        provider: 'open-meteo',
        checkedAt,
        available: false,
        conditionsValue: null,
        conditionsCopy: null,
        message: 'Ranch centroid is unavailable, so the weather feed cannot be checked.',
      };
    }

    const url = new URL(OPEN_METEO_BASE_URL);
    url.search = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      current: 'temperature_2m,weather_code,wind_speed_10m,wind_direction_10m',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      timezone: 'auto',
    }).toString();

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        this.logger.warn(`Open-Meteo conditions request failed with status ${response.status}.`);
        return {
          provider: 'open-meteo',
          checkedAt,
          available: false,
          conditionsValue: null,
          conditionsCopy: null,
          message: `Open-Meteo responded with status ${response.status}.`,
        };
      }

      const payload = (await response.json()) as OpenMeteoCurrentResponse;
      const current = payload.current;
      if (!current) {
        return {
          provider: 'open-meteo',
          checkedAt,
          available: false,
          conditionsValue: null,
          conditionsCopy: null,
          message: 'Open-Meteo responded without current weather data.',
        };
      }

      const temperature = Number(current.temperature_2m);
      const weatherCode = Number(current.weather_code);
      const windSpeed = Number(current.wind_speed_10m);
      const windDirection = Number(current.wind_direction_10m);

      if (!Number.isFinite(temperature) || !Number.isFinite(weatherCode)) {
        return {
          provider: 'open-meteo',
          checkedAt,
          available: false,
          conditionsValue: null,
          conditionsCopy: null,
          message: 'Open-Meteo responded, but required weather fields were missing.',
        };
      }

      return {
        provider: 'open-meteo',
        checkedAt,
        available: true,
        conditionsValue: `${Math.round(temperature)}C / ${describeWeatherCode(weatherCode)}`,
        conditionsCopy:
          Number.isFinite(windSpeed) && Number.isFinite(windDirection)
            ? `Wind: ${Math.round(windSpeed)}km/h ${formatWindDirection(windDirection)}`
            : 'Wind: Unavailable',
        message: 'Open-Meteo weather feed is reachable.',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown weather feed error';
      this.logger.warn(`Open-Meteo conditions unavailable. ${message}`);
      return {
        provider: 'open-meteo',
        checkedAt,
        available: false,
        conditionsValue: null,
        conditionsCopy: null,
        message: `Open-Meteo weather feed is unavailable. ${message}`,
      };
    }
  }
}

function describeWeatherCode(code: number) {
  switch (code) {
    case 0:
      return 'Clear';
    case 1:
      return 'Mainly clear';
    case 2:
      return 'Partly cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Fog';
    case 51:
    case 53:
    case 55:
      return 'Drizzle';
    case 56:
    case 57:
      return 'Freezing drizzle';
    case 61:
    case 63:
    case 65:
      return 'Rain';
    case 66:
    case 67:
      return 'Freezing rain';
    case 71:
    case 73:
    case 75:
      return 'Snow';
    case 77:
      return 'Snow grains';
    case 80:
    case 81:
    case 82:
      return 'Rain showers';
    case 85:
    case 86:
      return 'Snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
    case 99:
      return 'Thunderstorm with hail';
    default:
      return 'Unspecified';
  }
}

function formatWindDirection(degrees: number) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalizedDegrees / 45) % directions.length;
  return directions[index];
}
