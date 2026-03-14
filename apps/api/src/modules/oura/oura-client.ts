import { z } from "zod";

import {
  deactivateOuraConnection,
  getValidOuraConnection
} from "./oura-connection.service.js";
import {
  OuraApiRequestError,
  OuraAuthenticationError,
  isLikelyOuraAuthenticationFailure
} from "./oura-errors.js";

const OURA_API_BASE_URL = "https://api.ouraring.com/v2";

const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    next_token: z.string().nullable().optional()
  });

const sleepItemSchema = z.object({
  id: z.string(),
  day: z.string(),
  total_sleep_duration: z.number().nullable(),
  time_in_bed: z.number().nullable(),
  efficiency: z.number().nullable(),
  latency: z.number().nullable(),
  average_heart_rate: z.number().nullable(),
  lowest_heart_rate: z.number().nullable(),
  average_hrv: z.number().nullable(),
  bedtime_start: z.string().nullable(),
  bedtime_end: z.string().nullable()
});

const dailyReadinessItemSchema = z.object({
  id: z.string(),
  day: z.string(),
  score: z.number().nullable(),
  temperature_deviation: z.number().nullable(),
  contributors: z
    .object({
      activity_balance: z.number().nullable().optional()
    })
    .passthrough()
});

const dailyActivityItemSchema = z.object({
  id: z.string(),
  day: z.string(),
  active_calories: z.number().nullable(),
  total_calories: z.number().nullable(),
  steps: z.number().nullable(),
  equivalent_walking_distance: z.number().nullable()
});

export type OuraSleepItem = z.infer<typeof sleepItemSchema>;
export type OuraDailyReadinessItem = z.infer<typeof dailyReadinessItemSchema>;
export type OuraDailyActivityItem = z.infer<typeof dailyActivityItemSchema>;

export class OuraApiClient {
  async fetchSleep(startDate: string, endDate: string) {
    return this.fetchCollection(
      "/usercollection/sleep",
      sleepItemSchema,
      startDate,
      endDate
    );
  }

  async fetchDailyReadiness(startDate: string, endDate: string) {
    return this.fetchCollection(
      "/usercollection/daily_readiness",
      dailyReadinessItemSchema,
      startDate,
      endDate
    );
  }

  async fetchDailyActivity(startDate: string, endDate: string) {
    return this.fetchCollection(
      "/usercollection/daily_activity",
      dailyActivityItemSchema,
      startDate,
      endDate
    );
  }

  private async fetchCollection<T extends z.ZodTypeAny>(
    path: string,
    itemSchema: T,
    startDate: string,
    endDate: string
  ): Promise<Array<z.infer<T>>> {
    const connection = await getValidOuraConnection();

    if (!connection?.isActive) {
      throw new OuraAuthenticationError(
        "No active Oura connection is available. Connect or reconnect Oura and try again."
      );
    }

    const items: Array<z.infer<T>> = [];
    let nextToken: string | undefined;

    do {
      const url = new URL(`${OURA_API_BASE_URL}${path}`);
      url.searchParams.set("start_date", startDate);
      url.searchParams.set("end_date", endDate);

      if (nextToken) {
        url.searchParams.set("next_token", nextToken);
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: "application/json"
        }
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const errorCode =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : undefined;

        const requestError = new OuraApiRequestError(
          `Oura API request failed for ${path} with status ${response.status}`,
          {
            source: "api",
            status: response.status,
            errorCode
          }
        );

        if (isLikelyOuraAuthenticationFailure(requestError)) {
          await deactivateOuraConnection();
          throw new OuraAuthenticationError(
            "Oura rejected the stored authorization. Reconnect Oura and try again."
          );
        }

        throw requestError;
      }

      const parsed = paginatedResponseSchema(itemSchema).parse(payload);

      items.push(...parsed.data);
      nextToken = parsed.next_token ?? undefined;
    } while (nextToken);

    return items;
  }
}
