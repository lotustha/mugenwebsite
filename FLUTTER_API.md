# MugenAnime — Flutter API Guide

Reference for posts, wallpapers, push notifications, and in-app messages.

---

## Base Configuration

```dart
// lib/config/app_config.dart
class AppConfig {
  static const String baseUrl      = 'https://mugenanime.com';
  static const String deepLinkScheme = 'mugenanime';
}
```

---

## 1. Posts Endpoints

### List Posts
```
GET /api/posts
GET /api/posts?limit=20&page=1
GET /api/posts?exclude={slug}
```
**Response:** `List<Post>`

### Single Post
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

### Reading Analytics — `view` and `read`

```
POST /api/posts/{slug}/view
```

No auth required. **This feeds the AI Autopilot**, which decides what kinds of
posts to write more of based on what people actually engage with. Until the app
sends these events, app readers are invisible to it and the site's content mix is
steered by web visitors alone.

Send **two** distinct events per article:

| Event | When to send | Meaning |
| ----- | ------------ | ------- |
| view  | after ~5s on the article | the headline earned a click |
| read  | after the user scrolls past ~70% **and** has spent ~30s | they actually read it |

Both matter. A view alone only proves the title worked — without `read`, the
generator gets rewarded for clickbait.

**Request:**
```json
{ "deviceId": "<stable per-install id>", "source": "app", "event": "read" }
```
Omit `event` (or send `"view"`) for the view. `deviceId` should be a stable
random id generated once per install and persisted — it is hashed server-side
and used only to avoid counting the same reader twice.

**Response:**
```json
{ "ok": true, "counted": true }
```
`counted: false` is normal and safe to ignore — it means duplicate, bot, or a
`read` sent before its `view`. Always send the `view` first.

```dart
Future<void> trackPost(String slug, {bool read = false}) async {
  try {
    await http.post(
      Uri.parse('$baseUrl/api/posts/$slug/view'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'deviceId': await deviceId(),   // persisted, e.g. in shared_preferences
        'source': 'app',
        if (read) 'event': 'read',
      }),
    );
  } catch (_) {
    // Analytics must never disrupt reading.
  }
}
```

### Post Dart Model
```dart
class Post {
  final String id, title, slug, summary;
  final String? content, featuredImage, featuredImageAlt;
  final DateTime createdAt;

  Post.fromJson(Map<String, dynamic> j)
    : id               = j['id'],
      title            = j['title'],
      slug             = j['slug'],
      summary          = j['summary'] ?? '',
      content          = j['content'],
      featuredImage    = j['featuredImage'] ?? j['featured_image'],
      featuredImageAlt = j['featuredImageAlt'] ?? j['featured_image_alt'],
      createdAt        = DateTime.parse(j['createdAt'] ?? j['created_at']);
}
```

---

## 2. Wallpapers Endpoints

### List Wallpapers
```
GET /api/wallpapers
GET /api/wallpapers?category={slug}
GET /api/wallpapers?tag={slug}
GET /api/wallpapers?type=IMAGE
GET /api/wallpapers?type=VIDEO
GET /api/wallpapers?limit=20&page=1
```
**Response:** `List<Wallpaper>`

### Single Wallpaper
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
  "tags":       [{ "id": "uuid", "name": "demon slayer", "slug": "demon-slayer" }]
}
```

### Wallpaper Dart Models
```dart
enum WallpaperType { IMAGE, VIDEO }

class Wallpaper {
  final String id, title, fileUrl;
  final String? description;
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
      type           = (j['type'] ?? 'IMAGE') == 'VIDEO'
                         ? WallpaperType.VIDEO
                         : WallpaperType.IMAGE,
      downloadsCount = j['downloadsCount'] ?? j['downloads_count'] ?? 0,
      createdAt      = DateTime.parse(j['createdAt'] ?? j['created_at']),
      categories     = (j['categories'] as List? ?? [])
                         .map((c) => WallpaperCategory.fromJson(c)).toList(),
      tags           = (j['tags'] as List? ?? [])
                         .map((t) => WallpaperTag.fromJson(t)).toList();
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

## 3. HTTP Client

```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';

class ApiService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl:        AppConfig.baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ));

  // ── Posts ─────────────────────────────────────────────────────────────────
  static Future<List<Post>> getPosts({int limit = 20, int page = 1}) async {
    final res = await _dio.get('/api/posts',
        queryParameters: {'limit': limit, 'page': page});
    final list = res.data is List ? res.data : [];
    return (list as List).map((e) => Post.fromJson(e)).toList();
  }

  static Future<Post> getPost(String slug) async {
    final res = await _dio.get('/api/posts/$slug');
    return Post.fromJson(res.data);
  }

  // ── Wallpapers ────────────────────────────────────────────────────────────
  static Future<List<Wallpaper>> getWallpapers({
    String? category,
    String? tag,
    String? type,
    int limit = 20,
    int page  = 1,
  }) async {
    final res = await _dio.get('/api/wallpapers', queryParameters: {
      if (category != null) 'category': category,
      if (tag != null)      'tag':      tag,
      if (type != null)     'type':     type,
      'limit': limit,
      'page':  page,
    });
    final list = res.data is List ? res.data : (res.data['wallpapers'] ?? []);
    return (list as List).map((e) => Wallpaper.fromJson(e)).toList();
  }

  static Future<Wallpaper> getWallpaper(String id) async {
    final res = await _dio.get('/api/wallpapers/$id');
    return Wallpaper.fromJson(res.data);
  }
}
```

**Error handling:**
```dart
try {
  final post = await ApiService.getPost(slug);
} on DioException catch (e) {
  if (e.response?.statusCode == 404) {
    // not found
  }
}
```

---

## 4. Push Notifications — New Post / New Wallpaper

### pubspec.yaml
```yaml
dependencies:
  firebase_core:             ^3.0.0
  firebase_messaging:        ^15.0.0
  flutter_local_notifications: ^17.0.0
  go_router:                 ^14.0.0
  dio:                       ^5.0.0
```

### AndroidManifest.xml — deep-link intent filter
```xml
<!-- inside <activity> -->
<intent-filter>
  <action android:name="android.intent.action.VIEW"/>
  <category android:name="android.intent.category.DEFAULT"/>
  <category android:name="android.intent.category.BROWSABLE"/>
  <data android:scheme="mugenanime"/>
</intent-filter>
```

### 4.1 Notification Channels
```dart
// lib/services/notification_service.dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

final FlutterLocalNotificationsPlugin localNotifications =
    FlutterLocalNotificationsPlugin();

Future<void> createNotificationChannels() async {
  final android = localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

  await android?.createNotificationChannel(const AndroidNotificationChannel(
    'posts',
    'New Articles',
    description: 'Notifications for new anime news articles',
    importance: Importance.high,
  ));

  await android?.createNotificationChannel(const AndroidNotificationChannel(
    'wallpapers',
    'New Wallpapers',
    description: 'Notifications for new anime wallpapers',
    importance: Importance.high,
  ));
}
```

### 4.2 FCM Topics & Token Registration
```dart
// lib/services/fcm_service.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:dio/dio.dart';

class FcmService {
  static final _dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));

  static Future<void> init() async {
    final messaging = FirebaseMessaging.instance;

    await messaging.requestPermission(alert: true, badge: true, sound: true);

    // Subscribe to content topics — no server token needed for topic messages
    await messaging.subscribeToTopic('new_posts');
    await messaging.subscribeToTopic('new_wallpapers');

    // Register device token so admin can target this device specifically
    final token = await messaging.getToken();
    if (token != null) await _registerToken(token);
    messaging.onTokenRefresh.listen(_registerToken);
  }

  static Future<void> _registerToken(String token) async {
    try {
      await _dio.post('/api/notifications', data: {
        'token':    token,
        'platform': 'android', // or 'ios'
      });
    } catch (_) {}
  }

  static Future<void> unregister(String token) async {
    try {
      await _dio.delete('/api/notifications', data: {'token': token});
    } catch (_) {}
  }
}
```

**Token registration endpoints:**
```
POST   /api/notifications   { "token": "...", "platform": "android" }
DELETE /api/notifications   { "token": "..." }
```
Both respond `{ "ok": true }`.

### 4.3 Notification Payload

Every FCM message from MugenAnime carries a `data` map:

| Field      | Values                         | Description                                |
|------------|--------------------------------|--------------------------------------------|
| `type`     | `"post"` \| `"wallpaper"`     | Content type                               |
| `id`       | `String`                       | UUID of the item                           |
| `slug`     | `String`                       | Slug (posts only)                          |
| `title`    | `String`                       | Content title                              |
| `image`    | `String`                       | Thumbnail URL                              |
| `deepLink` | `mugenanime://post/slug` etc.  | Direct navigation target                   |

### 4.4 Notification Handler
```dart
// lib/services/notification_handler.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:go_router/go_router.dart';

class NotificationHandler {
  static late GoRouter _router;

  static void init(GoRouter router) {
    _router = router;

    // Foreground — show a local notification so the user sees it
    FirebaseMessaging.onMessage.listen(_showLocal);

    // Background — user tapped the notification banner
    FirebaseMessaging.onMessageOpenedApp.listen(_navigate);

    // Terminated — app opened via notification
    FirebaseMessaging.instance.getInitialMessage().then((msg) {
      if (msg != null) _navigate(msg);
    });
  }

  static void _navigate(RemoteMessage message) {
    final type = message.data['type'] ?? '';
    final id   = message.data['id']   ?? '';
    final slug = message.data['slug'] ?? id;

    switch (type) {
      case 'post':
        _router.push('/news/$slug');
        break;
      case 'wallpaper':
        _router.push('/wallpaper/$id');
        break;
    }
  }

  static void _showLocal(RemoteMessage message) {
    final n = message.notification;
    if (n == null) return;
    // Show via flutter_local_notifications
    // Channel ID: message.data['channelId'] ?? n.android?.channelId ?? 'general'
  }
}
```

### 4.5 When Notifications Fire

| Event                                     | FCM Topic       | Channel ID   |
|-------------------------------------------|-----------------|--------------|
| New article published (RSS import)        | `new_posts`     | `posts`      |
| New wallpaper uploaded via admin          | `new_wallpapers`| `wallpapers` |

### 4.6 main.dart Setup
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

@pragma('vm:entry-point')
Future<void> _bgHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_bgHandler);
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

## 5. In-App Messages (from Website → App)

The admin publishes an in-app message from the MugenAnime website. The app receives it via FCM and shows a non-dismissable overlay (banner or modal) while the app is open — **no system notification tray involved**.

### 5.1 How It Works

```
Admin writes message on website
        ↓
POST /api/admin/inapp-messages  (website → server)
        ↓
Server sends FCM data-only message (no notification block)
  to topic: "inapp_{packageName}"  e.g. "inapp_com.mugenanime.app"
        ↓
Flutter receives RemoteMessage in foreground handler
  data.type == "inapp"
        ↓
InAppMessageOverlay shown inside the app UI
```

### 5.2 FCM Payload for In-App Messages

```json
{
  "data": {
    "type":       "inapp",
    "style":      "banner",
    "title":      "v2.2 Update Available",
    "body":       "Tap to see what's new in the latest release.",
    "imageUrl":   "https://mugenanime.com/images/update-banner.jpg",
    "ctaLabel":   "See What's New",
    "ctaAction":  "url",
    "ctaTarget":  "https://mugenanime.com/apps/mugen-anime",
    "dismissible": "true"
  }
}
```

| Field        | Values                                     | Description                               |
|--------------|--------------------------------------------|-------------------------------------------|
| `type`       | `"inapp"`                                  | Triggers overlay, not a tray notification |
| `style`      | `"banner"` \| `"modal"`                    | Banner slides from top; modal is centred  |
| `title`      | `String`                                   | Headline text                             |
| `body`       | `String`                                   | Sub-text                                  |
| `imageUrl`   | `String?`                                  | Optional hero image URL                   |
| `ctaLabel`   | `String?`                                  | Button label                              |
| `ctaAction`  | `"url"` \| `"deeplink"` \| `"dismiss"`    | What the button does                      |
| `ctaTarget`  | `String?`                                  | URL or deep-link path                     |
| `dismissible`| `"true"` \| `"false"`                     | Whether user can close it                 |

### 5.3 Flutter — Subscribe to App Topic
```dart
// In FcmService.init(), add:
const packageName = 'com.mugenanime.app'; // your actual package name
await messaging.subscribeToTopic('inapp_${packageName.replaceAll('.', '_')}');
// topic name must be alphanumeric + underscore, so dots → underscores
// result: "inapp_com_mugenanime_app"
```

### 5.4 InAppMessage Model
```dart
class InAppMessage {
  final String style;       // "banner" | "modal"
  final String title;
  final String body;
  final String? imageUrl;
  final String? ctaLabel;
  final String? ctaAction;  // "url" | "deeplink" | "dismiss"
  final String? ctaTarget;
  final bool dismissible;

  InAppMessage.fromData(Map<String, dynamic> d)
    : style       = d['style']       ?? 'banner',
      title       = d['title']       ?? '',
      body        = d['body']        ?? '',
      imageUrl    = d['imageUrl'],
      ctaLabel    = d['ctaLabel'],
      ctaAction   = d['ctaAction'],
      ctaTarget   = d['ctaTarget'],
      dismissible = (d['dismissible'] ?? 'true') == 'true';
}
```

### 5.5 InAppOverlay Widget
```dart
// lib/widgets/in_app_overlay.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class InAppOverlay extends StatefulWidget {
  final InAppMessage message;
  final VoidCallback onDismiss;

  const InAppOverlay({
    super.key,
    required this.message,
    required this.onDismiss,
  });

  @override
  State<InAppOverlay> createState() => _InAppOverlayState();
}

class _InAppOverlayState extends State<InAppOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<Offset> _slide;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 350),
    )..forward();

    final isBanner = widget.message.style == 'banner';
    _slide = Tween<Offset>(
      begin: isBanner ? const Offset(0, -1) : const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutCubic));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _handleCta() async {
    final action = widget.message.ctaAction;
    final target = widget.message.ctaTarget ?? '';

    if (action == 'url') {
      await launchUrl(Uri.parse(target), mode: LaunchMode.externalApplication);
    } else if (action == 'deeplink') {
      if (mounted) context.push(target);
    }
    widget.onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.message;
    final isBanner = m.style == 'banner';

    return Align(
      alignment: isBanner ? Alignment.topCenter : Alignment.center,
      child: SlideTransition(
        position: _slide,
        child: Material(
          color: Colors.transparent,
          child: Container(
            margin: EdgeInsets.fromLTRB(
              16,
              isBanner ? MediaQuery.of(context).padding.top + 8 : 0,
              16,
              0,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFF0F0A1E),
              borderRadius: BorderRadius.circular(isBanner ? 16 : 20),
              border: Border.all(color: const Color(0x338B5CF6)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x448B5CF6),
                  blurRadius: 32,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (m.imageUrl != null)
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(20)),
                    child: Image.network(
                      m.imageUrl!,
                      height: 160,
                      fit: BoxFit.cover,
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(m.title,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                )),
                          ),
                          if (m.dismissible)
                            GestureDetector(
                              onTap: widget.onDismiss,
                              child: const Icon(Icons.close,
                                  color: Colors.white38, size: 18),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(m.body,
                          style: const TextStyle(
                              color: Colors.white54, fontSize: 13)),
                      if (m.ctaLabel != null) ...[
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          child: TextButton(
                            onPressed: _handleCta,
                            style: TextButton.styleFrom(
                              backgroundColor: const Color(0xFF8B5CF6),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: Text(m.ctaLabel!,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

### 5.6 Showing the Overlay from the Foreground Handler

Use an `OverlayEntry` in your root navigator so the message appears above any screen:

```dart
// lib/services/notification_handler.dart  (extend existing class)

static OverlayState? _overlay;
static OverlayEntry? _inAppEntry;

/// Call once from the root widget's initState
static void setOverlay(OverlayState overlay) => _overlay = overlay;

static void _showLocal(RemoteMessage message) {
  final data = message.data;

  if (data['type'] == 'inapp') {
    _showInApp(data);
    return; // don't show a system tray notification for inapp messages
  }

  final n = message.notification;
  if (n == null) return;
  // ... existing local notification display code ...
}

static void _showInApp(Map<String, dynamic> data) {
  if (_overlay == null) return;

  final msg = InAppMessage.fromData(data);

  _inAppEntry = OverlayEntry(
    builder: (_) => InAppOverlay(
      message: msg,
      onDismiss: _dismissInApp,
    ),
  );

  _overlay!.insert(_inAppEntry!);

  // Auto-dismiss banners after 6 seconds if dismissible
  if (msg.style == 'banner' && msg.dismissible) {
    Future.delayed(const Duration(seconds: 6), _dismissInApp);
  }
}

static void _dismissInApp() {
  _inAppEntry?.remove();
  _inAppEntry = null;
}
```

```dart
// In your root widget (e.g. HomeScreen or MaterialApp wrapper):
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    NotificationHandler.setOverlay(Overlay.of(context));
  });
}
```

### 5.7 go_router Routes (Posts + Wallpapers)

```dart
// lib/router/app_router.dart
final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(path: '/',           builder: (_, __) => const HomeScreen()),
    GoRoute(path: '/news',       builder: (_, __) => const NewsListScreen()),
    GoRoute(path: '/wallpapers', builder: (_, __) => const WallpaperBrowseScreen()),

    GoRoute(
      path: '/news/:slug',
      builder: (_, state) =>
          NewsDetailScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(
      path: '/wallpaper/:id',
      builder: (_, state) =>
          WallpaperDetailScreen(id: state.pathParameters['id']!),
    ),
  ],
);
```

---

## 6. Search Endpoints

### 6.1 Wallpaper Search

```
GET /api/wallpapers/search?q={query}
GET /api/wallpapers/search?q={query}&limit=12
GET /api/wallpapers/search?q={query}&type=IMAGE
GET /api/wallpapers/search?q={query}&type=VIDEO
```

- `q` — required; returns `[]` when empty
- `limit` — default `12`, max `30`
- `type` — optional filter: `IMAGE` or `VIDEO`
- Searches: **title**, **tag names**, **category names**

**Response:** `List<WallpaperSearchResult>`
```json
[
  {
    "id": "uuid",
    "title": "Demon Slayer Epic",
    "fileUrl": "https://supabase.co/storage/...",
    "type": "IMAGE",
    "categories": [{ "id": "uuid", "name": "Anime", "slug": "anime" }],
    "tags":       [{ "id": "uuid", "name": "demon slayer", "slug": "demon-slayer" }]
  }
]
```

> **Note:** `fileUrl` is the direct storage URL — use it for both thumbnails and downloads.

### 6.2 Post Search

```
GET /api/posts/search?q={query}
GET /api/posts/search?q={query}&limit=10
```

- `q` — required; returns `[]` when empty
- `limit` — default `10`, max `30`
- Searches: **title**, **summary**, **tag names**, **category names** (published posts only)

**Response:** `List<PostSearchResult>`
```json
[
  {
    "id": "uuid",
    "title": "Attack on Titan Final Season Review",
    "slug": "attack-on-titan-final-season-review",
    "summary": "Short summary...",
    "featuredImage": "https://...",
    "createdAt": "2025-05-01T10:00:00Z",
    "categories": [{ "id": "uuid", "name": "Reviews", "slug": "reviews" }],
    "tags":       [{ "id": "uuid", "name": "attack on titan", "slug": "attack-on-titan" }]
  }
]
```

### 6.3 Dart Models

```dart
// lib/models/search_result.dart

class WallpaperSearchResult {
  final String id, title, fileUrl;
  final WallpaperType type;
  final List<WallpaperCategory> categories;
  final List<WallpaperTag> tags;

  bool get isVideo => type == WallpaperType.VIDEO;

  WallpaperSearchResult.fromJson(Map<String, dynamic> j)
    : id         = j['id'],
      title      = j['title'],
      fileUrl    = j['fileUrl'] ?? j['file_url'] ?? '',
      type       = (j['type'] ?? 'IMAGE') == 'VIDEO'
                     ? WallpaperType.VIDEO
                     : WallpaperType.IMAGE,
      categories = (j['categories'] as List? ?? [])
                     .map((c) => WallpaperCategory.fromJson(c)).toList(),
      tags       = (j['tags'] as List? ?? [])
                     .map((t) => WallpaperTag.fromJson(t)).toList();
}

class PostSearchResult {
  final String id, title, slug, summary;
  final String? featuredImage;
  final DateTime createdAt;
  final List<Category> categories;
  final List<Tag> tags;

  PostSearchResult.fromJson(Map<String, dynamic> j)
    : id            = j['id'],
      title         = j['title'],
      slug          = j['slug'],
      summary       = j['summary'] ?? '',
      featuredImage = j['featuredImage'] ?? j['featured_image'],
      createdAt     = DateTime.parse(j['createdAt'] ?? j['created_at']),
      categories    = (j['categories'] as List? ?? [])
                        .map((c) => Category.fromJson(c)).toList(),
      tags          = (j['tags'] as List? ?? [])
                        .map((t) => Tag.fromJson(t)).toList();
}

class Category {
  final String id, name, slug;
  Category.fromJson(Map<String, dynamic> j)
    : id = j['id'], name = j['name'], slug = j['slug'];
}

class Tag {
  final String id, name, slug;
  Tag.fromJson(Map<String, dynamic> j)
    : id = j['id'], name = j['name'], slug = j['slug'];
}
```

### 6.4 ApiService Methods

Add to `ApiService` in `lib/services/api_service.dart`:

```dart
// ── Search ─────────────────────────────────────────────────────────────────

static Future<List<WallpaperSearchResult>> searchWallpapers(
  String query, {
  int limit = 12,
  String? type,
}) async {
  if (query.trim().isEmpty) return [];
  final res = await _dio.get('/api/wallpapers/search', queryParameters: {
    'q':     query.trim(),
    'limit': limit,
    if (type != null) 'type': type,
  });
  final list = res.data as List? ?? [];
  return list.map((e) => WallpaperSearchResult.fromJson(e)).toList();
}

static Future<List<PostSearchResult>> searchPosts(
  String query, {
  int limit = 10,
}) async {
  if (query.trim().isEmpty) return [];
  final res = await _dio.get('/api/posts/search', queryParameters: {
    'q':     query.trim(),
    'limit': limit,
  });
  final list = res.data as List? ?? [];
  return list.map((e) => PostSearchResult.fromJson(e)).toList();
}
```

### 6.5 SearchScreen — Full Implementation

A unified search screen that queries both wallpapers and posts, debounced at 400 ms.

```dart
// lib/screens/search_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

enum SearchTab { all, wallpapers, posts }

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final _controller = TextEditingController();
  Timer? _debounce;

  List<WallpaperSearchResult> _wallpapers = [];
  List<PostSearchResult> _posts = [];
  bool _loading = false;
  String _lastQuery = '';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _controller.addListener(_onQueryChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _tabs.dispose();
    super.dispose();
  }

  void _onQueryChanged() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), _search);
  }

  Future<void> _search() async {
    final q = _controller.text.trim();
    if (q == _lastQuery) return;
    _lastQuery = q;

    if (q.isEmpty) {
      setState(() { _wallpapers = []; _posts = []; });
      return;
    }

    setState(() => _loading = true);

    try {
      final results = await Future.wait([
        ApiService.searchWallpapers(q),
        ApiService.searchPosts(q),
      ]);
      if (!mounted) return;
      setState(() {
        _wallpapers = results[0] as List<WallpaperSearchResult>;
        _posts      = results[1] as List<PostSearchResult>;
        _loading    = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0416),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0416),
        title: TextField(
          controller: _controller,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          cursorColor: const Color(0xFF8B5CF6),
          decoration: InputDecoration(
            hintText: 'Search wallpapers, news…',
            hintStyle: const TextStyle(color: Colors.white38),
            border: InputBorder.none,
            suffixIcon: _controller.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Colors.white38),
                    onPressed: () {
                      _controller.clear();
                      setState(() { _wallpapers = []; _posts = []; _lastQuery = ''; });
                    },
                  )
                : null,
          ),
        ),
        bottom: TabBar(
          controller: _tabs,
          labelColor: const Color(0xFF8B5CF6),
          unselectedLabelColor: Colors.white38,
          indicatorColor: const Color(0xFF8B5CF6),
          tabs: [
            Tab(text: 'All (${_wallpapers.length + _posts.length})'),
            Tab(text: 'Wallpapers (${_wallpapers.length})'),
            Tab(text: 'Posts (${_posts.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF8B5CF6)))
          : TabBarView(
              controller: _tabs,
              children: [
                _AllResultsTab(wallpapers: _wallpapers, posts: _posts),
                _WallpapersTab(wallpapers: _wallpapers),
                _PostsTab(posts: _posts),
              ],
            ),
    );
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────

class _AllResultsTab extends StatelessWidget {
  final List<WallpaperSearchResult> wallpapers;
  final List<PostSearchResult> posts;
  const _AllResultsTab({required this.wallpapers, required this.posts});

  @override
  Widget build(BuildContext context) {
    if (wallpapers.isEmpty && posts.isEmpty) {
      return const _EmptyState();
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (wallpapers.isNotEmpty) ...[
          const _SectionHeader(title: 'Wallpapers'),
          _WallpaperGrid(wallpapers: wallpapers.take(6).toList()),
          const SizedBox(height: 16),
        ],
        if (posts.isNotEmpty) ...[
          const _SectionHeader(title: 'News'),
          ...posts.take(5).map((p) => _PostTile(post: p)),
        ],
      ],
    );
  }
}

class _WallpapersTab extends StatelessWidget {
  final List<WallpaperSearchResult> wallpapers;
  const _WallpapersTab({required this.wallpapers});

  @override
  Widget build(BuildContext context) {
    if (wallpapers.isEmpty) return const _EmptyState();
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 9 / 16,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: wallpapers.length,
      itemBuilder: (context, i) => _WallpaperCard(wallpaper: wallpapers[i]),
    );
  }
}

class _PostsTab extends StatelessWidget {
  final List<PostSearchResult> posts;
  const _PostsTab({required this.posts});

  @override
  Widget build(BuildContext context) {
    if (posts.isEmpty) return const _EmptyState();
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: posts.length,
      itemBuilder: (context, i) => _PostTile(post: posts[i]),
    );
  }
}

// ── Item Widgets ──────────────────────────────────────────────────────────

class _WallpaperGrid extends StatelessWidget {
  final List<WallpaperSearchResult> wallpapers;
  const _WallpaperGrid({required this.wallpapers});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 9 / 16,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
      ),
      itemCount: wallpapers.length,
      itemBuilder: (context, i) => _WallpaperCard(wallpaper: wallpapers[i]),
    );
  }
}

class _WallpaperCard extends StatelessWidget {
  final WallpaperSearchResult wallpaper;
  const _WallpaperCard({required this.wallpaper});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/wallpaper/${wallpaper.id}'),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              wallpaper.fileUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  Container(color: const Color(0xFF1A0D2E)),
            ),
            if (wallpaper.isVideo)
              const Positioned(
                bottom: 6,
                right: 6,
                child: Icon(Icons.play_circle_filled,
                    color: Colors.white70, size: 20),
              ),
          ],
        ),
      ),
    );
  }
}

class _PostTile extends StatelessWidget {
  final PostSearchResult post;
  const _PostTile({required this.post});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/news/${post.slug}'),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF0F0A1E),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0x228B5CF6)),
        ),
        child: Row(
          children: [
            if (post.featuredImage != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  post.featuredImage!,
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      Container(width: 72, height: 72, color: const Color(0xFF1A0D2E)),
                ),
              ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    post.summary,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Shared ────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title,
          style: const TextStyle(
              color: Color(0xFF8B5CF6),
              fontSize: 13,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8)),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text('No results found',
          style: TextStyle(color: Colors.white38, fontSize: 15)),
    );
  }
}
```

### 6.6 Router Integration

Add the search route to `app_router.dart`:

```dart
GoRoute(
  path: '/search',
  builder: (_, __) => const SearchScreen(),
),
```

Open search from a search icon anywhere:
```dart
IconButton(
  icon: const Icon(Icons.search),
  onPressed: () => context.push('/search'),
)
```

### 6.7 Search Behavior Summary

| Behavior | Detail |
|---|---|
| Debounce | 400 ms after last keystroke |
| Empty query | Returns `[]` immediately, no network call |
| Parallel fetch | Wallpapers + posts fetched simultaneously via `Future.wait` |
| Tab counts | Update live after each search |
| Navigation | Wallpaper → `/wallpaper/{id}`, Post → `/news/{slug}` |
| Thumbnail field | Search uses `imageUrl`; detail page uses `fileUrl` from `/api/wallpapers/{id}` |

---

## 7. Notification + In-App Message Flow

```
── New Post ──────────────────────────────────────────────────
RSS feed runs → post created + autoPublish: true
  → sendPostNotification()
  → FCM topic: new_posts
  → RemoteMessage.data = {
      type: "post", id: "uuid",
      slug: "attack-on-titan-review",
      title: "...", image: "...",
      deepLink: "mugenanime://post/attack-on-titan-review"
    }
  → User taps tray notification
  → router.push('/news/attack-on-titan-review')
  → GET /api/posts/attack-on-titan-review

── New Wallpaper ──────────────────────────────────────────────
Admin uploads wallpaper
  → sendWallpaperNotification()
  → FCM topic: new_wallpapers
  → RemoteMessage.data = {
      type: "wallpaper", id: "uuid",
      title: "...", image: "...",
      deepLink: "mugenanime://wallpaper/uuid"
    }
  → User taps tray notification
  → router.push('/wallpaper/uuid')
  → GET /api/wallpapers/uuid

── In-App Message ────────────────────────────────────────────
Admin writes message on website → POST /api/admin/inapp-messages
  → FCM data-only message to topic: inapp_com_mugenanime_app
  → RemoteMessage.data = {
      type: "inapp", style: "banner",
      title: "...", body: "...",
      ctaLabel: "...", ctaAction: "url",
      ctaTarget: "https://mugenanime.com/..."
    }
  → App is foregrounded → _showLocal intercepts type == "inapp"
  → InAppOverlay inserted into root Overlay
  → User taps CTA → launchUrl / router.push
  → Banner auto-dismisses after 6 s (or user closes it)
```

---

## 8. Apps Endpoints (App Catalog)

Public catalog of every app listed on the website (the `/apps` page). Useful for
"More Apps" screens, cross-promotion, and resolving the **app slug** used by the
in-app messages API (see `IN_APP_MESSAGES_FLUTTER.md`).

### List All Apps

```
GET https://mugenstream.fun/api/apps
```

Returns an array of all apps, newest first. ⚠️ This list is **not** filtered by
`published` — check the `published` flag client-side before displaying.

```json
[
  {
    "id": "uuid",
    "slug": "noon-anime-ml",
    "name": "Noon Anime Multi Language",
    "tagline": "…",
    "description": "…",
    "category": "Entertainment",
    "version": "1.2.0",
    "size": "25 MB",
    "packageName": "com.noonanime.watchhindi",
    "iconUrl": "/uploads/appsicons/….webp",
    "bannerUrl": "/uploads/appsbanners/….webp",
    "videoUrl": "/uploads/appsvideos/….mp4",
    "privacyPolicy": "…",
    "published": true,
    "featured": false,
    "createdAt": "…", "updatedAt": "…",
    "links":       [{ "platform": "playstore", "url": "https://…" }],
    "screenshots": [{ "url": "/uploads/…", "caption": null, "order": 0 }],
    "faqs":        [{ "question": "…", "answer": "…", "order": 0 }]
  }
]
```

Media URLs (`iconUrl`, `bannerUrl`, `videoUrl`, screenshot `url`) are
**site-relative** — prepend `https://mugenstream.fun` in the app.

### Single App

```
GET https://mugenstream.fun/api/apps/{idOrSlug}
```

Accepts a UUID **or** a slug (e.g. `/api/apps/noon-anime-ml`). Unlike the list
endpoint, this one only returns **published** apps; unpublished → `404`.

### Current App Slugs (as of 2026-07-17)

| Slug | App | Package |
|---|---|---|
| `mugen-anime` | Mugen Anime | `com.mugenstream.anime` |
| `noon-anime` | Noon Anime | `com.noonanime.watch` |
| `noon-anime-ml` | Noon Anime Multi Language (Hindi) | `com.noonanime.watchhindi` |
| `noonflix` | Noonflix | `com.lynoon.movie` |
| `wordpuzzel` | Word Bloom | `com.allthemyth.word_puzzle` |
| `guitar-tuner` | Guitar Tuner | `com.guitartuner.pro` |
| `tappy-dash` | Tappy Dash | `com.mugen.tappydash` |
| `nepse-hub` | NEPSE Hub | `com.nepse.nepse` |

> The slug — not the package name — is what the in-app messages API expects in
> its `app` query parameter. Fetch this endpoint (or check `/api/apps` in a
> browser) rather than trusting this table to stay current.
