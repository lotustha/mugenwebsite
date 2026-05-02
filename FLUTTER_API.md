# MugenAnime — Flutter App API Guide

Complete reference for building the MugenAnime Flutter app.
Use this document to understand all available endpoints, response schemas, Firebase push notification setup, and deep-link routing.

---

## Base Configuration

```dart
// lib/config/app_config.dart
class AppConfig {
  static const String baseUrl = 'https://mugenanime.com'; // change to your VPS domain
  static const String deepLinkScheme = 'mugenanime';
}
```

---

## 1. Anime Endpoints

### 1.1 Recently Added Anime
```
GET /api/anime/recent
```
**Response:** `List<AnimeItem>`

### 1.2 New Releases
```
GET /api/anime/new
```
**Response:** `List<AnimeItem>`

### 1.3 Spotlight / Featured
```
GET /api/anime/spotlight
```
**Response:** `List<SpotlightItem>`

### 1.4 Weekly Schedule
```
GET /api/anime/schedule
```
**Response:**
```json
{
  "monday":    [{ "id": "...", "name": "...", "jname": "...", "time": "10:30" }],
  "tuesday":   [...],
  "wednesday": [...],
  "thursday":  [...],
  "friday":    [...],
  "saturday":  [...],
  "sunday":    [...]
}
```

### 1.5 Anime Detail + Episodes
```
GET /api/anime/info?id={animeId}
```
**Response:**
```json
{
  "id": "one-piece",
  "title": "One Piece",
  "name": "One Piece",
  "image": "https://...",
  "poster": "https://...",
  "cover": "https://...",
  "description": "...",
  "synopsis": "...",
  "status": "Ongoing",
  "genres": ["Action", "Adventure"],
  "episodes": [
    {
      "number": 1110,
      "title": "Episode Title",
      "episodeId": "one-piece-ep-1110",
      "id": "one-piece-ep-1110"
    }
  ]
}
```

### 1.6 Search Anime
```
GET /api/anime/search?query={query}
```
**Response:** `List<AnimeItem>`

### AnimeItem Dart Model
```dart
class AnimeItem {
  final String id;
  final String? animeId;
  final String? title;
  final String? name;
  final String? image;
  final String? poster;
  final String? thumbnail;
  final String? status;
  final int? episodes;

  String get displayTitle => title ?? name ?? '';
  String get displayImage => image ?? poster ?? thumbnail ?? '';
  String get displayId => id ?? animeId ?? '';

  AnimeItem.fromJson(Map<String, dynamic> j)
    : id        = j['id'] ?? j['animeId'] ?? '',
      animeId   = j['animeId'],
      title     = j['title'],
      name      = j['name'],
      image     = j['image'],
      poster    = j['poster'],
      thumbnail = j['thumbnail'],
      status    = j['status'],
      episodes  = j['episodes'];
}
```

---

## 2. Wallpaper Endpoints

### 2.1 List Wallpapers
```
GET /api/wallpapers
GET /api/wallpapers?category={slug}
GET /api/wallpapers?tag={slug}
GET /api/wallpapers?type=IMAGE
GET /api/wallpapers?type=VIDEO
GET /api/wallpapers?limit=20&page=1
```
**Response:** `List<Wallpaper>`

### 2.2 Single Wallpaper
```
GET /api/wallpapers/{id}
```
**Response:**
```json
{
  "id": "uuid",
  "title": "Demon Slayer Epic",
  "description": "...",
  "fileUrl": "https://supabase.co/storage/v1/object/public/...",
  "type": "IMAGE",
  "downloadsCount": 1240,
  "createdAt": "2025-01-01T00:00:00Z",
  "categories": [{ "id": "uuid", "name": "Anime", "slug": "anime" }],
  "tags": [{ "id": "uuid", "name": "demon slayer", "slug": "demon-slayer" }]
}
```

### Wallpaper Dart Model
```dart
enum WallpaperType { IMAGE, VIDEO }

class Wallpaper {
  final String id;
  final String title;
  final String? description;
  final String fileUrl;
  final WallpaperType type;
  final int downloadsCount;
  final DateTime createdAt;
  final List<WallpaperCategory> categories;
  final List<WallpaperTag> tags;

  bool get isVideo => type == WallpaperType.VIDEO;

  Wallpaper.fromJson(Map<String, dynamic> j)
    : id             = j['id'],
      title          = j['title'],
      description    = j['description'],
      fileUrl        = j['fileUrl'] ?? j['file_url'],
      type           = (j['type'] ?? 'IMAGE') == 'VIDEO' ? WallpaperType.VIDEO : WallpaperType.IMAGE,
      downloadsCount = j['downloadsCount'] ?? j['downloads_count'] ?? 0,
      createdAt      = DateTime.parse(j['createdAt'] ?? j['created_at']),
      categories     = (j['categories'] as List? ?? []).map((c) => WallpaperCategory.fromJson(c)).toList(),
      tags           = (j['tags'] as List? ?? []).map((t) => WallpaperTag.fromJson(t)).toList();
}

class WallpaperCategory {
  final String id, name, slug;
  WallpaperCategory.fromJson(Map<String, dynamic> j)
    : id = j['id'], name = j['name'], slug = j['slug'];
}

class WallpaperTag {
  final String id, name, slug;
  WallpaperTag.fromJson(Map<String, dynamic> j)
    : id = j['id'], name = j['name'], slug = j['slug'];
}
```

---

## 3. News / Posts Endpoints

### 3.1 List Posts
```
GET /api/posts
GET /api/posts?limit=20&page=1
GET /api/posts?exclude={slug}    ← exclude a slug from results
```
**Response:** `List<Post>`

### 3.2 Single Post
```
GET /api/posts/{slug}
```
**Response:**
```json
{
  "id": "uuid",
  "title": "Attack on Titan Final Season Review",
  "slug": "attack-on-titan-final-season-review",
  "summary": "Two-sentence summary of the article.",
  "content": "<p>Full HTML content...</p>",
  "featuredImage": "https://...",
  "featuredImageAlt": "...",
  "createdAt": "2025-05-01T10:00:00Z"
}
```

### Post Dart Model
```dart
class Post {
  final String id, title, slug, summary;
  final String? content, featuredImage, featuredImageAlt;
  final DateTime createdAt;

  Post.fromJson(Map<String, dynamic> j)
    : id              = j['id'],
      title           = j['title'],
      slug            = j['slug'],
      summary         = j['summary'] ?? '',
      content         = j['content'],
      featuredImage   = j['featuredImage'] ?? j['featured_image'],
      featuredImageAlt = j['featuredImageAlt'] ?? j['featured_image_alt'],
      createdAt       = DateTime.parse(j['createdAt'] ?? j['created_at']);
}
```

---

## 4. Apps Endpoints

### 4.1 List Apps
```
GET /api/apps
```
**Response:** `List<App>` — sorted by featured first, then newest

### 4.2 Single App
```
GET /api/apps/{slug}     ← slug-based (SEO friendly)
GET /api/apps/{uuid}     ← UUID fallback
```
**Response:**
```json
{
  "id": "uuid",
  "slug": "mugen-anime",
  "name": "MugenAnime",
  "tagline": "Watch anime without limits",
  "description": "Full description...",
  "category": "Entertainment",
  "iconUrl": "https://...",
  "bannerUrl": "https://...",
  "videoUrl": "https://youtube.com/...",
  "version": "2.1.0",
  "size": "45 MB",
  "packageName": "com.mugenanime.app",
  "published": true,
  "featured": true,
  "links": [
    { "id": "uuid", "platform": "PlayStore", "url": "https://play.google.com/..." },
    { "id": "uuid", "platform": "APK", "url": "https://..." }
  ],
  "screenshots": [
    { "id": "uuid", "url": "https://...", "caption": "Home screen", "order": 0 }
  ],
  "faqs": [
    { "id": "uuid", "question": "Is it free?", "answer": "Yes, completely free.", "order": 0 }
  ]
}
```

---

## 5. Firebase Push Notifications

### 5.1 Flutter Setup

**pubspec.yaml dependencies:**
```yaml
dependencies:
  firebase_core: ^3.0.0
  firebase_messaging: ^15.0.0
  flutter_local_notifications: ^17.0.0
  go_router: ^14.0.0        # for deep-link routing
  dio: ^5.0.0               # for HTTP calls
```

**AndroidManifest.xml** — add inside `<activity>`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="mugenanime"/>
</intent-filter>
```

**android/app/src/main/res/drawable/notification_icon.png** — add a white notification icon.

### 5.2 Notification Channels (Android)
```dart
// lib/services/notification_service.dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotifications =
    FlutterLocalNotificationsPlugin();

Future<void> createNotificationChannels() async {
  const postsChannel = AndroidNotificationChannel(
    'posts',
    'New Articles',
    description: 'Notifications for new anime news articles',
    importance: Importance.high,
  );
  const wallpapersChannel = AndroidNotificationChannel(
    'wallpapers',
    'New Wallpapers',
    description: 'Notifications for new anime wallpapers',
    importance: Importance.high,
  );
  const generalChannel = AndroidNotificationChannel(
    'general',
    'General',
    description: 'General announcements',
    importance: Importance.defaultImportance,
  );

  await flutterLocalNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(postsChannel);
  await flutterLocalNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(wallpapersChannel);
  await flutterLocalNotifications
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(generalChannel);
}
```

### 5.3 Topic Subscriptions

The server sends to topics — **Flutter subscribes, no server token registration needed**.

```dart
// lib/services/fcm_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:dio/dio.dart';

class FcmService {
  static final _dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));

  /// Call once on app launch
  static Future<void> init() async {
    final messaging = FirebaseMessaging.instance;

    // Request permission (iOS + Android 13+)
    await messaging.requestPermission(
      alert: true, badge: true, sound: true,
    );

    // Subscribe to content topics
    await messaging.subscribeToTopic('new_posts');
    await messaging.subscribeToTopic('new_wallpapers');
    await messaging.subscribeToTopic('all');

    // Register token with server (for targeted notifications)
    final token = await messaging.getToken();
    if (token != null) await _registerToken(token);

    // Re-register on token refresh
    messaging.onTokenRefresh.listen(_registerToken);
  }

  static Future<void> _registerToken(String token) async {
    try {
      await _dio.post('/api/notifications', data: {
        'token': token,
        'platform': 'android', // or 'ios'
      });
    } catch (_) {}
  }
}
```

### 5.4 Notification Payload Structure

Every notification from MugenAnime has a `data` map:

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"post"` \| `"wallpaper"` \| `"app"` | Content type |
| `id` | `String` | UUID of the item |
| `slug` | `String` | Slug (posts and apps) |
| `title` | `String` | Content title |
| `image` | `String` | Image URL |
| `deepLink` | `String` | `mugenanime://post/slug` or `mugenanime://wallpaper/id` |

### 5.5 Handling Notifications + Deep Links

```dart
// lib/services/notification_handler.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';

class NotificationHandler {
  static late GoRouter _router;

  static void init(GoRouter router) {
    _router = router;

    // App in foreground
    FirebaseMessaging.onMessage.listen(_handleForeground);

    // App in background — user tapped notification
    FirebaseMessaging.onMessageOpenedApp.listen(_navigateFromMessage);

    // App was terminated — opened via notification
    FirebaseMessaging.instance.getInitialMessage().then((msg) {
      if (msg != null) _navigateFromMessage(msg);
    });
  }

  static void _handleForeground(RemoteMessage message) {
    // Show a local notification so user sees it while app is open
    _showLocalNotification(message);
  }

  static void _navigateFromMessage(RemoteMessage message) {
    final data = message.data;
    final type = data['type'] ?? '';
    final id   = data['id'] ?? '';
    final slug = data['slug'] ?? id;

    switch (type) {
      case 'post':
        _router.push('/news/$slug');
        break;
      case 'wallpaper':
        _router.push('/wallpaper/$id');
        break;
      case 'app':
        _router.push('/app/$slug');
        break;
    }
  }

  static void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;
    // Use flutter_local_notifications to show in foreground
    // Channel ID comes from data['channelId'] or notification.android?.channelId
  }
}
```

### 5.6 go_router Deep-Link Configuration

```dart
// lib/router/app_router.dart
import 'package:go_router/go_router.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/',          builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/anime',     builder: (_, __) => const AnimeBrowseScreen()),
    GoRoute(path: '/wallpapers',builder: (_, __) => const WallpaperBrowseScreen()),
    GoRoute(path: '/news',      builder: (_, __) => const NewsListScreen()),
    GoRoute(path: '/apps',      builder: (_, __) => const AppsScreen()),

    // Deep-link targets from notifications
    GoRoute(
      path: '/news/:slug',
      builder: (_, state) => NewsDetailScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(
      path: '/wallpaper/:id',
      builder: (_, state) => WallpaperDetailScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/anime/:id',
      builder: (_, state) => AnimeDetailScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/app/:slug',
      builder: (_, state) => AppDetailScreen(slug: state.pathParameters['slug']!),
    ),
  ],
);
```

### 5.7 Main App Setup

```dart
// lib/main.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

// Background message handler — must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // You can process data here if needed
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
  await createNotificationChannels();
  await FcmService.init();
  runApp(const MugenAnimeApp());
}

class MugenAnimeApp extends StatefulWidget {
  const MugenAnimeApp({super.key});

  @override
  State<MugenAnimeApp> createState() => _MugenAnimeAppState();
}

class _MugenAnimeAppState extends State<MugenAnimeApp> {
  @override
  void initState() {
    super.initState();
    NotificationHandler.init(appRouter);
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
    routerConfig: appRouter,
    title: 'MugenAnime',
    theme: ThemeData.dark(),
  );
}
```

---

## 6. HTTP Client (Dio)

```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';

class ApiService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConfig.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  // ── Anime ────────────────────────────────────────────────────────────────
  static Future<List<AnimeItem>> getRecentAnime() async {
    final res = await _dio.get('/api/anime/recent');
    final list = res.data is List ? res.data : (res.data['results'] ?? []);
    return (list as List).map((e) => AnimeItem.fromJson(e)).toList();
  }

  static Future<List<AnimeItem>> getNewReleases() async {
    final res = await _dio.get('/api/anime/new');
    final list = res.data is List ? res.data : (res.data['results'] ?? []);
    return (list as List).map((e) => AnimeItem.fromJson(e)).toList();
  }

  static Future<Map<String, dynamic>> getAnimeInfo(String id) async {
    final res = await _dio.get('/api/anime/info', queryParameters: {'id': id});
    return res.data;
  }

  static Future<List<AnimeItem>> searchAnime(String query) async {
    final res = await _dio.get('/api/anime/search', queryParameters: {'query': query});
    final list = res.data is List ? res.data : (res.data['results'] ?? res.data['suggestions'] ?? []);
    return (list as List).map((e) => AnimeItem.fromJson(e)).toList();
  }

  // ── Wallpapers ───────────────────────────────────────────────────────────
  static Future<List<Wallpaper>> getWallpapers({
    String? category, String? tag, String? type, int limit = 20, int page = 1,
  }) async {
    final res = await _dio.get('/api/wallpapers', queryParameters: {
      if (category != null) 'category': category,
      if (tag != null) 'tag': tag,
      if (type != null) 'type': type,
      'limit': limit, 'page': page,
    });
    final list = res.data is List ? res.data : (res.data['wallpapers'] ?? []);
    return (list as List).map((e) => Wallpaper.fromJson(e)).toList();
  }

  static Future<Wallpaper> getWallpaper(String id) async {
    final res = await _dio.get('/api/wallpapers/$id');
    return Wallpaper.fromJson(res.data);
  }

  // ── Posts ────────────────────────────────────────────────────────────────
  static Future<List<Post>> getPosts({int limit = 20, int page = 1}) async {
    final res = await _dio.get('/api/posts', queryParameters: {'limit': limit, 'page': page});
    final list = res.data is List ? res.data : [];
    return (list as List).map((e) => Post.fromJson(e)).toList();
  }

  static Future<Post> getPost(String slug) async {
    final res = await _dio.get('/api/posts/$slug');
    return Post.fromJson(res.data);
  }

  // ── Apps ─────────────────────────────────────────────────────────────────
  static Future<List<dynamic>> getApps() async {
    final res = await _dio.get('/api/apps');
    return res.data is List ? res.data : [];
  }

  static Future<Map<String, dynamic>> getApp(String slug) async {
    final res = await _dio.get('/api/apps/$slug');
    return res.data;
  }
}
```

---

## 7. Notification Registration API

### Register FCM Token
```
POST /api/notifications
Content-Type: application/json

{
  "token": "fcm_device_token_here",
  "platform": "android"   // or "ios"
}
```
**Response:** `{ "ok": true }`

### Unregister FCM Token
```
DELETE /api/notifications
Content-Type: application/json

{ "token": "fcm_device_token_here" }
```
**Response:** `{ "ok": true }`

---

## 8. When Notifications Are Sent

| Event | Topic | Channel ID |
|-------|-------|------------|
| New article published via RSS import | `new_posts` | `posts` |
| New wallpaper uploaded via admin | `new_wallpapers` | `wallpapers` |
| Manual broadcast from admin panel | configurable | `general` |

---

## 9. Error Handling

All API endpoints return standard HTTP status codes:
- `200` — success
- `400` — bad request (missing required fields)
- `404` — not found
- `500` — server error

Error response shape:
```json
{ "error": "Description of what went wrong" }
```

**Dio error handling:**
```dart
try {
  final data = await ApiService.getPost(slug);
} on DioException catch (e) {
  if (e.response?.statusCode == 404) {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

---

## 10. Complete Notification Flow Diagram

```
[Admin uploads wallpaper]
        ↓
[Server: /api/admin/wallpapers POST]
        ↓
[sendWallpaperNotification()]
        ↓
[FCM: topic/new_wallpapers]
        ↓
[Flutter device receives RemoteMessage]
  data: {
    type: "wallpaper",
    id: "uuid",
    title: "Demon Slayer Epic",
    image: "https://...",
    deepLink: "mugenanime://wallpaper/uuid"
  }
        ↓
[User taps notification]
        ↓
[NotificationHandler._navigateFromMessage()]
        ↓
[router.push('/wallpaper/uuid')]
        ↓
[WallpaperDetailScreen — fetch GET /api/wallpapers/uuid]
```

```
[RSS feed runs — new article]
        ↓
[rss-processor: post created + autoPublish: true]
        ↓
[sendPostNotification()]
        ↓
[FCM: topic/new_posts]
        ↓
[Flutter device receives RemoteMessage]
  data: {
    type: "post",
    id: "uuid",
    slug: "attack-on-titan-review",
    title: "Attack on Titan Review",
    image: "https://...",
    deepLink: "mugenanime://post/attack-on-titan-review"
  }
        ↓
[User taps notification]
        ↓
[router.push('/news/attack-on-titan-review')]
        ↓
[NewsDetailScreen — fetch GET /api/posts/attack-on-titan-review]
```
