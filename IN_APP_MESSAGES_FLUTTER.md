# In-App Messages — Flutter Integration

This document extends `FLUTTER_API.md` with the in-app messaging system.

---

## API Endpoints

### Fetch Active Messages

```
GET /api/in-app-messages?app={appSlug}&deviceId={deviceId}
```

Call on every app launch. Returns messages for the specified app plus global messages (targetApp = null), ordered by priority descending.

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `app` | No | App slug e.g. `mugen-anime`. Filters to this app + global. |
| `deviceId` | No | Anonymous UUID from SharedPreferences. Server skips already-clicked non-persistent messages. |

**Response:** Array of InAppMessage objects:

```json
[
  {
    "id": "uuid",
    "title": "New Update Available!",
    "body": "Version 2.5 is here with amazing new features.",
    "imageUrl": "https://...",
    "buttonText": "Update Now",
    "buttonUrl": "https://play.google.com/store/apps/details?id=...",
    "style": "promo",
    "targetApp": "mugen-anime",
    "persistent": false,
    "cancelable": true,
    "priority": 10,
    "active": true,
    "startsAt": null,
    "endsAt": null
  }
]
```

**Style values:** `info` | `promo` | `warning` | `alert`

---

### Track Events

```
POST /api/in-app-messages/track
Content-Type: application/json

{
  "messageId": "uuid",
  "event": "impression",
  "deviceId": "anonymous-uuid"
}
```

| `event` value | When to call |
|---|---|
| `impression` | When message modal is displayed |
| `click` | When user taps the action button |

**Response:** `{ "ok": true }`

---

## Dart Models

```dart
enum MessageStyle { info, promo, warning, alert }

class InAppMessage {
  final String id;
  final String title;
  final String body;
  final String? imageUrl;
  final String? buttonText;
  final String? buttonUrl;
  final MessageStyle style;
  final String? targetApp;
  final bool persistent;
  final bool cancelable;
  final int priority;

  InAppMessage.fromJson(Map<String, dynamic> j)
    : id         = j['id'],
      title      = j['title'],
      body       = j['body'],
      imageUrl   = j['imageUrl'],
      buttonText = j['buttonText'],
      buttonUrl  = j['buttonUrl'],
      style      = MessageStyle.values.firstWhere(
                     (s) => s.name == (j['style'] ?? 'info'),
                     orElse: () => MessageStyle.info),
      targetApp  = j['targetApp'],
      persistent = j['persistent'] ?? false,
      cancelable = j['cancelable'] ?? true,
      priority   = j['priority'] ?? 0;
}
```

---

## InAppMessageService

```dart
// lib/services/in_app_message_service.dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

class InAppMessageService {
  static final _dio = Dio(BaseOptions(baseUrl: AppConfig.baseUrl));
  static const _deviceKey = 'device_id';
  static const _clickedKey = 'clicked_messages';

  static Future<String> getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var id = prefs.getString(_deviceKey);
    if (id == null) {
      id = const Uuid().v4();
      await prefs.setString(_deviceKey, id);
    }
    return id;
  }

  static Future<List<InAppMessage>> fetchMessages(String appSlug) async {
    try {
      final deviceId = await getDeviceId();
      final res = await _dio.get('/api/in-app-messages', queryParameters: {
        'app': appSlug,
        'deviceId': deviceId,
      });
      return (res.data as List)
          .map((e) => InAppMessage.fromJson(e))
          .toList()
        ..sort((a, b) => b.priority.compareTo(a.priority));
    } catch (_) {
      return [];
    }
  }

  static Future<void> trackImpression(String messageId) async {
    final deviceId = await getDeviceId();
    try {
      await _dio.post('/api/in-app-messages/track',
          data: {'messageId': messageId, 'event': 'impression', 'deviceId': deviceId});
    } catch (_) {}
  }

  static Future<void> trackClick(String messageId) async {
    final deviceId = await getDeviceId();
    try {
      await _dio.post('/api/in-app-messages/track',
          data: {'messageId': messageId, 'event': 'click', 'deviceId': deviceId});
    } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    final clicked = prefs.getStringList(_clickedKey) ?? [];
    if (!clicked.contains(messageId)) {
      await prefs.setStringList(_clickedKey, [...clicked, messageId]);
    }
  }
}
```

---

## Modal Widget

```dart
// lib/widgets/in_app_message_modal.dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

class InAppMessageModal extends StatelessWidget {
  final InAppMessage message;
  final VoidCallback onDismiss;
  const InAppMessageModal({super.key, required this.message, required this.onDismiss});

  Color get _accent => switch (message.style) {
    MessageStyle.promo   => const Color(0xFFA78BFA),
    MessageStyle.warning => const Color(0xFFFBBF24),
    MessageStyle.alert   => const Color(0xFFF87171),
    _                    => const Color(0xFF60A5FA),
  };

  Future<void> _onButtonTap(BuildContext context) async {
    await InAppMessageService.trackClick(message.id);
    final url = message.buttonUrl;
    if (url == null) { onDismiss(); return; }
    if (url.startsWith('mugenanime://')) {
      if (context.mounted) context.push(url.replaceFirst('mugenanime:/', ''));
    } else {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
    onDismiss();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: message.cancelable,  // blocks back button when cancelable = false
      child: Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(20),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0B0416),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _accent.withOpacity(0.3)),
            boxShadow: [BoxShadow(color: _accent.withOpacity(0.15), blurRadius: 40)],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (message.imageUrl != null)
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                  child: Image.network(message.imageUrl!, height: 160,
                      width: double.infinity, fit: BoxFit.cover),
                ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Badge row
                  Row(children: [
                    _Badge(label: message.style.name.toUpperCase(), color: _accent),
                    if (message.persistent) ...[
                      const SizedBox(width: 6),
                      _Badge(label: 'PERSISTENT', color: const Color(0xFFFBBF24)),
                    ],
                    if (!message.cancelable) ...[
                      const SizedBox(width: 6),
                      _Badge(label: 'REQUIRED', color: const Color(0xFFF87171)),
                    ],
                  ]),
                  const SizedBox(height: 12),
                  Text(message.title,
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(message.body,
                      style: TextStyle(color: Colors.white.withOpacity(0.65), fontSize: 14, height: 1.5)),
                  const SizedBox(height: 20),
                  Row(children: [
                    if (message.buttonText != null)
                      Expanded(
                        child: FilledButton(
                          onPressed: () => _onButtonTap(context),
                          style: FilledButton.styleFrom(
                            backgroundColor: _accent,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Text(message.buttonText!,
                              style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
                        ),
                      ),
                    if (message.buttonText != null && message.cancelable) const SizedBox(width: 10),
                    if (message.cancelable)
                      TextButton(
                        onPressed: onDismiss,
                        style: TextButton.styleFrom(foregroundColor: Colors.white38),
                        child: const Text('Dismiss'),
                      ),
                  ]),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  const _Badge({required this.label, required this.color});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
    child: Text(label, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
  );
}
```

---

## Show on App Launch

```dart
// In HomeScreen or SplashScreen:
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) => _showMessages());
}

Future<void> _showMessages() async {
  final messages = await InAppMessageService.fetchMessages('mugen-anime');
  for (final msg in messages) {
    if (!mounted) break;
    await InAppMessageService.trackImpression(msg.id);
    await showDialog(
      context: context,
      barrierDismissible: msg.cancelable,
      builder: (_) => InAppMessageModal(
        message: msg,
        onDismiss: () => Navigator.of(context).pop(),
      ),
    );
  }
}
```

---

## Behaviour Reference

| persistent | cancelable | Behaviour |
|-----------|-----------|-----------|
| false | true | Normal — dismiss or click, never shows again |
| true | true | Shows every launch until button is clicked |
| false | false | Shows once — user MUST click button (back blocked) |
| true | false | Shows every launch — user MUST click button each time |

---

## Deep Link URL Format in buttonUrl

| Target | URL Format |
|--------|------------|
| News article | `mugenanime://news/article-slug` |
| Wallpaper | `mugenanime://wallpaper/uuid` |
| App page | `mugenanime://app/app-slug` |
| Anime detail | `mugenanime://anime/anime-id` |
| External URL | `https://play.google.com/...` |

---

## Admin Panel

Access at `/admin/in-app-messages`. Features:
- Create messages with live **Preview** tab
- Target specific apps or all apps
- Set persistent / cancelable behaviour
- Schedule with start/end dates
- **Redeploy** button: re-activate with optional stat reset
- **Deactivate** without deleting
- Live stats: Shown / Clicked / CTR per message
- Aggregate stats bar at top of page
