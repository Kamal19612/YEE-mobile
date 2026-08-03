/** Données de démo — Phase 3 (membres & profils) */

export const memberSortOptions = [
  { id: 'active', label: 'Recently Active' },
  { id: 'newest', label: 'Newest Registered' },
  { id: 'alphabetical', label: 'Alphabetical' },
]

export const memberTypeFilters = [
  { id: 'all', label: 'All Members' },
  { id: 'friends', label: 'My Friends' },
  { id: 'online', label: 'Online' },
]

export const demoMembers = [
  {
    id: 1,
    userLogin: 'alex',
    displayName: 'Alex Martin',
    mentionName: 'alex',
    avatar: null,
    cover:
      'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80',
    bio: 'Community builder and product designer. Always happy to help newcomers.',
    location: 'Paris, France',
    joined: '2024-03-12T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    online: true,
    friendshipStatus: 'self',
    stats: { friends: 48, groups: 6, activity: 128 },
    memberType: 'Member',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'Community builder and product designer.' },
          { id: 'location', name: 'Location', value: 'Paris, France' },
          { id: 'website', name: 'Website', value: 'https://example.com' },
        ],
      },
      {
        id: 'details',
        name: 'Details',
        fields: [
          { id: 'job', name: 'Job Title', value: 'Product Designer' },
          { id: 'skills', name: 'Skills', value: 'UX, Figma, Community' },
        ],
      },
    ],
    friends: [2, 3, 4],
    groups: [
      { id: 7, name: 'Design Crew', members: 42 },
      { id: 8, name: 'Paris Meetup', members: 118 },
    ],
  },
  {
    id: 2,
    userLogin: 'sophie',
    displayName: 'Sophie Durand',
    mentionName: 'sophie',
    avatar: null,
    cover:
      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
    bio: 'Community guidelines lead. Passionate about inclusive spaces.',
    location: 'Lyon, France',
    joined: '2024-05-02T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    online: true,
    friendshipStatus: 'is_friend',
    stats: { friends: 62, groups: 4, activity: 96 },
    memberType: 'Moderator',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'Community guidelines lead.' },
          { id: 'location', name: 'Location', value: 'Lyon, France' },
        ],
      },
    ],
    friends: [1, 3],
    groups: [{ id: 7, name: 'Design Crew', members: 42 }],
  },
  {
    id: 3,
    userLogin: 'julien',
    displayName: 'Julien Petit',
    mentionName: 'julien',
    avatar: null,
    cover: null,
    bio: 'Frontend engineer exploring React headless WordPress.',
    location: 'Nantes, France',
    joined: '2024-08-18T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    online: false,
    friendshipStatus: 'pending',
    stats: { friends: 21, groups: 2, activity: 44 },
    memberType: 'Member',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'Frontend engineer.' },
          { id: 'location', name: 'Location', value: 'Nantes, France' },
        ],
      },
    ],
    friends: [1, 2],
    groups: [{ id: 8, name: 'Paris Meetup', members: 118 }],
  },
  {
    id: 4,
    userLogin: 'camille',
    displayName: 'Camille Roux',
    mentionName: 'camille',
    avatar: null,
    cover:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
    bio: 'Design systems & critique sessions every Thursday.',
    location: 'Bordeaux, France',
    joined: '2025-01-09T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    online: true,
    friendshipStatus: 'not_friends',
    stats: { friends: 35, groups: 5, activity: 71 },
    memberType: 'Member',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'Design systems enthusiast.' },
          { id: 'location', name: 'Location', value: 'Bordeaux, France' },
        ],
      },
    ],
    friends: [1],
    groups: [{ id: 7, name: 'Design Crew', members: 42 }],
  },
  {
    id: 5,
    userLogin: 'nora',
    displayName: 'Nora Benali',
    mentionName: 'nora',
    avatar: null,
    cover: null,
    bio: 'Just joined the community — happy to meet everyone!',
    location: 'Marseille, France',
    joined: '2025-11-20T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    online: false,
    friendshipStatus: 'not_friends',
    stats: { friends: 8, groups: 1, activity: 12 },
    memberType: 'Member',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'New to the community.' },
          { id: 'location', name: 'Location', value: 'Marseille, France' },
        ],
      },
    ],
    friends: [],
    groups: [],
  },
  {
    id: 6,
    userLogin: 'lucas',
    displayName: 'Lucas Moreau',
    mentionName: 'lucas',
    avatar: null,
    cover: null,
    bio: 'Photographer and weekend hiker.',
    location: 'Grenoble, France',
    joined: '2025-06-01T10:00:00.000Z',
    lastActive: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    online: true,
    friendshipStatus: 'is_friend',
    stats: { friends: 19, groups: 3, activity: 33 },
    memberType: 'Member',
    xprofile: [
      {
        id: 'base',
        name: 'Profile Info',
        fields: [
          { id: 'about', name: 'About Me', value: 'Photographer and weekend hiker.' },
          { id: 'location', name: 'Location', value: 'Grenoble, France' },
        ],
      },
    ],
    friends: [2],
    groups: [{ id: 8, name: 'Paris Meetup', members: 118 }],
  },
]

export const demoInvites = [
  { id: 1, email: 'friend@example.com', status: 'pending', sentAt: '2026-07-20T10:00:00.000Z' },
  { id: 2, email: 'colleague@example.com', status: 'accepted', sentAt: '2026-06-02T10:00:00.000Z' },
]

export const demoFriendRequests = [
  { id: 3, fromUserId: 3, message: 'Hey Alex, let’s connect!' },
]
