import { getCurrentEvent } from './calendar.js';
import { updateBoard } from './vestaboard.js';
import { resolveDynamicContent } from './content-providers/index.js';

export default {
  async scheduled(event, env, ctx) {
    console.log('Starting scheduled calendar check...');

    const config = {
      ICS_CALENDAR_URL: env.ICS_CALENDAR_URL,
      VESTABOARD_API_KEY: env.VESTABOARD_API_KEY,
      OPENWEATHER_API_KEY: env.OPENWEATHER_API_KEY,
      OPENWEATHER_LAT: env.OPENWEATHER_LAT,
      OPENWEATHER_LON: env.OPENWEATHER_LON,
      STATE_STORAGE_PATH: env.STATE_STORAGE_PATH || './vestaboard-state.json',
    };

    try {
      const currentEvent = await getCurrentEvent(config.ICS_CALENDAR_URL);

      if (currentEvent) {
        console.log('Current event found:', currentEvent.summary);

        // Check summary (title) for content provider keywords first,
        // then fall back to description or raw summary for display
        let resolvedMessage = await resolveDynamicContent(currentEvent.summary, config);
        if (resolvedMessage === currentEvent.summary && currentEvent.description) {
          resolvedMessage = currentEvent.description;
        }

        if (typeof resolvedMessage === 'object' && resolvedMessage.skipBoardUpdate) {
          const action = resolvedMessage.action;
          if (resolvedMessage.error) {
            console.error(`${action.toUpperCase()} command failed:`, resolvedMessage.error);
            return;
          }
          console.log(`${action.toUpperCase()} command completed successfully`);
          return;
        }

        console.log('Updating board with resolved content');
        const updateResult = await updateBoard(resolvedMessage, config.VESTABOARD_API_KEY);

        if (!updateResult.success) {
          console.error('Failed to update Vestaboard:', updateResult.error);
          return;
        }

        console.log('Calendar check finished. Board updated for event:', currentEvent.summary);
      } else {
        console.log('No current event found. Calendar check finished.');
      }
    } catch (error) {
      console.error('Error during calendar check:', error);
    }
  }
};
