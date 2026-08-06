/**
 * Modération via feed unifié (CPT récits ou BuddyPress Activity).
 */
import { getPendingFeedItems, moderateFeedItem } from './storiesFeed'

export async function fetchPendingStories({ page = 1, perPage = 10 } = {}) {
  return getPendingFeedItems({ page, perPage })
}

export async function moderateStory(id, { action, comment = '' } = {}) {
  return moderateFeedItem(id, { action, comment })
}
