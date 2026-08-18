import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'scan_code.dart';

/// Profile, study totals and every preference in one scroll. Sign-out sits
/// alone at the very bottom, away from the switches it should never be
/// confused with.
class SettingsTab extends StatefulWidget {
  const SettingsTab({
    required this.session,
    required this.settings,
    required this.stats,
    required this.cards,
    required this.api,
    required this.profile,
    required this.onSettingsChanged,
    required this.onProfileChanged,
    required this.onEditNickname,
    required this.onSignOut,
    super.key,
  });

  final Session session;
  final AppSettings settings;
  final StudyStats stats;
  final List<StudyCard> cards;
  final SyncApi api;
  final Profile? profile;
  final ValueChanged<AppSettings> onSettingsChanged;
  final ValueChanged<Profile> onProfileChanged;
  final VoidCallback onEditNickname;
  final Future<void> Function() onSignOut;

  @override
  State<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<SettingsTab> {
  bool _wallpaperBusy = false;
  bool _widgetBusy = false;
  bool _deleteBusy = false;
  bool _languageBusy = false;

  void _apply(AppSettings value) => widget.onSettingsChanged(value);

  Future<void> _setShareFeed(bool value) async {
    try {
      widget.onProfileChanged(await widget.api.updateProfile(shareFeed: value));
    } on ApiException catch (error) {
      _toast(error.message, error: true);
    }
  }

  Future<void> _setLanguage(String code) async {
    if (code == (widget.profile?.language ?? 'ru')) return;
    setState(() => _languageBusy = true);
    try {
      widget.onProfileChanged(
        await widget.api.updateProfile(language: code),
      );
      _toast('New words will be explained in ${cardLanguages[code]}.');
    } on ApiException catch (error) {
      _toast(error.message, error: true);
    } catch (_) {
      _toast('No connection — the language was not changed.', error: true);
    } finally {
      if (mounted) setState(() => _languageBusy = false);
    }
  }

  Future<void> _pinWidget() async {
    setState(() => _widgetBusy = true);
    try {
      final pinned = await NativeBridge.pinWidget();
      _toast(
        pinned
            ? 'Confirm the placement on your home screen.'
            : 'Your launcher cannot add it directly. Long-press the home '
                  'screen, choose Widgets, then Subtitle Notes.',
        error: !pinned,
      );
    } on PlatformException catch (error) {
      _toast(error.message ?? 'Could not add the widget.', error: true);
    } finally {
      if (mounted) setState(() => _widgetBusy = false);
    }
  }

  Future<void> _setWallpaper() async {
    if (widget.cards.isEmpty) {
      _toast('Save a word first.', error: true);
      return;
    }
    setState(() => _wallpaperBusy = true);
    try {
      await NativeBridge.setLockWallpaper(widget.cards.first);
      _toast('Lock screen updated with your latest word.');
    } on PlatformException catch (error) {
      _toast(error.message ?? 'Could not change the lock screen.', error: true);
    } finally {
      if (mounted) setState(() => _wallpaperBusy = false);
    }
  }

  void _toast(String message, {bool error = false}) {
    if (!mounted) return;
    final c = context.c;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: error ? c.red : c.green,
          content: Text(
            message,
            style: font(
              size: 15,
              weight: 700,
              color: error ? c.onRed : c.onGreen,
              height: 1.3,
            ),
          ),
        ),
      );
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await confirmDestructive(
      context,
      icon: Icons.logout_rounded,
      title: context.t('Sign out on this phone?'),
      message: context.t('Your words stay in the cloud. Signing back in restores them.'),
      confirmLabel: context.t('Sign out'),
      cancelLabel: context.t('Stay signed in'),
    );
    if (confirmed) await widget.onSignOut();
  }

  /// Signing out and deleting the account sit next to each other, so the
  /// difference has to be unmistakable: one keeps the words in the cloud, the
  /// other burns them. Hence the count in the question and a confirm label
  /// that says what happens rather than "OK".
  Future<void> _confirmDeleteAccount() async {
    final saved = widget.cards.length;
    final confirmed = await confirmDestructive(
      context,
      icon: Icons.delete_forever_rounded,
      title: context.t('Delete your account?'),
      message: saved == 0
          ? 'Your account, and anything saved under it, is erased from the '
                'server for good. This cannot be undone.'
          : 'All $saved saved ${saved == 1 ? 'word' : 'words'}, your likes and '
                'your friends are erased from the server for good. This cannot '
                'be undone.',
      confirmLabel: context.t('Delete for good'),
      cancelLabel: context.t('Keep my account'),
    );
    if (!confirmed) return;
    setState(() => _deleteBusy = true);
    try {
      await widget.api.deleteAccount();
    } on ApiException catch (error) {
      if (mounted) setState(() => _deleteBusy = false);
      _toast(error.message, error: true);
      return;
    } catch (_) {
      if (mounted) setState(() => _deleteBusy = false);
      _toast('No connection. The account was not deleted.', error: true);
      return;
    }
    // The account is gone, so the session it belonged to is meaningless.
    await widget.onSignOut();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final settings = widget.settings;
    final stats = widget.stats;
    final email = widget.session.email;
    final initial = email.isEmpty ? '?' : email.characters.first.toUpperCase();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.gutter,
            AppSpace.md,
            AppSpace.gutter,
            AppSpace.md,
          ),
          decoration: BoxDecoration(
            color: c.surface,
            border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
          ),
          child: Row(
            children: [
              IconTile(
                icon: Icons.person_rounded,
                color: c.onBlue,
                background: c.blue,
                size: 36,
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(context.t('You'), style: AppText.heading(c.ink)),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(
              AppSpace.gutter,
              AppSpace.lg,
              AppSpace.gutter,
              AppSpace.h1,
            ),
            children: [
              AppCard(
                raised: true,
                padding: const EdgeInsets.all(AppSpace.lg),
                child: Row(
                  children: [
                    Container(
                      height: 54,
                      width: 54,
                      decoration: BoxDecoration(
                        color: c.greenWash,
                        borderRadius: BorderRadius.circular(AppRadius.button),
                        border: Border.all(
                          color: c.green.withValues(alpha: .35),
                          width: 1.5,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        initial,
                        style: font(
                          size: 24,
                          weight: 900,
                          color: c.green,
                          height: 1,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpace.lg),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.profile?.nickname ??
                                (email.isEmpty
                                    ? 'Signed in'
                                    : email.split('@').first),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.word(c.ink),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.profile?.nickname == null
                                ? email
                                : '${widget.profile!.friendCount} friends · '
                                      '${widget.profile!.followerCount} added you',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppText.caption(c.ink3),
                          ),
                        ],
                      ),
                    ),
                    Squish(
                      onTap: widget.onEditNickname,
                      semanticLabel: context.t('Change your nickname'),
                      child: SizedBox(
                        height: 44,
                        width: 44,
                        child: Icon(Icons.edit_rounded, size: 19, color: c.ink3),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.md),
              Row(
                children: [
                  Expanded(
                    child: _Metric(
                      value: '${stats.total}',
                      label: context.t('in library'),
                      color: c.green,
                    ),
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: _Metric(
                      value: '${stats.learned}',
                      label: 'learned',
                      color: c.amber,
                    ),
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: _Metric(
                      value: '${stats.sources}',
                      label: 'sources',
                      color: c.purple,
                    ),
                  ),
                ],
              ),

              _Section(
                title: context.t('Friends'),
                icon: Icons.people_alt_rounded,
                color: c.purple,
                description: widget.profile?.nickname == null
                    ? 'Pick a nickname so friends can find you.'
                    : 'Friends find you as @${widget.profile!.nickname}.',
                children: [
                  PushButton(
                    label: widget.profile?.nickname == null
                        ? 'Pick a nickname'
                        : 'Change nickname',
                    icon: Icons.alternate_email_rounded,
                    tone: PushTone.neutral,
                    onPressed: widget.onEditNickname,
                  ),
                  const SizedBox(height: AppSpace.lg),
                  _Toggle(
                    title: context.t('Show my words to friends'),
                    subtitle: context.t('Off keeps your library private; you can still see theirs.'),
                    value: widget.profile?.shareFeed ?? true,
                    onChanged: _setShareFeed,
                  ),
                ],
              ),

              _Section(
                title: context.t('Achievements'),
                icon: Icons.emoji_events_rounded,
                color: c.amber,
                description:
                    context.t('Nothing here expires. Every level is a running total of what you have already saved.'),
                children: [
                  for (var index = 0;
                      index < stats.achievements.length;
                      index++) ...[
                    if (index > 0)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          vertical: AppSpace.lg,
                        ),
                        child: Divider(
                          color: c.line,
                          height: 1.5,
                          thickness: 1.5,
                        ),
                      ),
                    AchievementRow(achievement: stats.achievements[index]),
                  ],
                ],
              ),

              _Section(
                title: context.t('Language of the cards'),
                icon: Icons.translate_rounded,
                color: c.blue,
                description:
                    context.t('New words are explained in this language. Ones already saved keep the language they were written in.'),
                children: [
                  _LanguagePicker(
                    value: widget.profile?.language ?? 'ru',
                    busy: _languageBusy,
                    onChanged: _setLanguage,
                  ),
                ],
              ),

              _Section(
                title: context.t('Interface language'),
                icon: Icons.language_rounded,
                color: c.green,
                description:
                    'Follow your phone, or choose the language Subtitle Notes uses.',
                children: [
                  _InterfaceLanguagePicker(
                    value: settings.interfaceLanguage,
                    onChanged: (value) =>
                        _apply(settings.copyWith(interfaceLanguage: value)),
                  ),
                ],
              ),

              _Section(
                title: context.t('Interface'),
                icon: Icons.tune_rounded,
                color: c.green,
                description:
                    'Keep only the words, or open up practice and friends too.',
                children: [
                  _Toggle(
                    title: context.t('Simple interface'),
                    subtitle: context.t('Just your words and a search box. Hides practice, friends and the achievement panel.'),
                    value: settings.simpleMode,
                    onChanged: (value) =>
                        _apply(settings.copyWith(simpleMode: value)),
                  ),
                ],
              ),
              _Section(
                title: context.t('Appearance'),
                icon: Icons.palette_rounded,
                color: c.purple,
                children: [
                  _Choice<ThemeMode>(
                    value: settings.themeMode,
                    onChanged: (value) =>
                        _apply(settings.copyWith(themeMode: value)),
                    options: const [
                      (ThemeMode.system, 'Auto', Icons.brightness_auto_rounded),
                      (ThemeMode.light, 'Light', Icons.light_mode_rounded),
                      (ThemeMode.dark, 'Dark', Icons.dark_mode_rounded),
                    ],
                  ),
                ],
              ),

              _Section(
                title: context.t('When you share text'),
                icon: Icons.bolt_rounded,
                color: c.green,
                description: settings.captureMode == CaptureMode.review
                    ? 'A preview opens first so you can edit the phrase and its source.'
                    : 'Saved and translated instantly, without an extra tap.',
                children: [
                  _Choice<CaptureMode>(
                    value: settings.captureMode,
                    onChanged: (value) =>
                        _apply(settings.copyWith(captureMode: value)),
                    options: const [
                      (CaptureMode.review, 'Review', Icons.edit_note_rounded),
                      (
                        CaptureMode.saveImmediately,
                        'Save now',
                        Icons.bolt_rounded,
                      ),
                    ],
                  ),
                ],
              ),

              _Section(
                title: context.t('Library'),
                icon: Icons.style_rounded,
                color: c.blue,
                children: [
                  _Choice<LibraryLayout>(
                    value: settings.libraryLayout,
                    onChanged: (value) =>
                        _apply(settings.copyWith(libraryLayout: value)),
                    options: const [
                      (
                        LibraryLayout.list,
                        'List',
                        Icons.view_agenda_rounded,
                      ),
                      (LibraryLayout.grid, 'Cards', Icons.grid_view_rounded),
                    ],
                  ),
                  const SizedBox(height: AppSpace.lg),
                  _Toggle(
                    title: context.t('Show the original line'),
                    subtitle: context.t('Keeps the scene around each meaning.'),
                    value: settings.showOriginal,
                    onChanged: (value) =>
                        _apply(settings.copyWith(showOriginal: value)),
                  ),
                  const SizedBox(height: AppSpace.md),
                  _Toggle(
                    title: context.t('Compact cards'),
                    subtitle: context.t('Fit more words on one screen.'),
                    value: settings.compactCards,
                    onChanged: (value) =>
                        _apply(settings.copyWith(compactCards: value)),
                  ),
                ],
              ),

              _Section(
                title: context.t('Connected devices'),
                icon: Icons.devices_rounded,
                color: c.blue,
                description:
                    context.t('The computer and the browser can sign in with the same Google account themselves. Approving a code here is the other way in: scan or type the eight characters they show.'),
                children: [
                  PushButton(
                    label: context.t('Connect a device'),
                    icon: Icons.add_link_rounded,
                    tone: PushTone.neutral,
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PairDevicePage(api: widget.api),
                      ),
                    ),
                  ),
                ],
              ),

              _Section(
                title: context.t('Lock screen'),
                icon: Icons.wallpaper_rounded,
                color: c.purple,
                description:
                    'Turn your latest saved word into a wallpaper. The image is drawn on the phone; nothing is uploaded.',
                children: [
                  PushButton(
                    label: context.t('Use latest word'),
                    icon: Icons.auto_fix_high_rounded,
                    tone: PushTone.neutral,
                    loading: _wallpaperBusy,
                    onPressed: _setWallpaper,
                  ),
                ],
              ),

              _Section(
                title: context.t('Home-screen widget'),
                icon: Icons.widgets_rounded,
                color: c.green,
                description:
                    'A card on your home screen that rotates through your saved words. Tap it to open the full explanation.',
                children: [
                  PushButton(
                    label: context.t('Add to home screen'),
                    icon: Icons.add_to_home_screen_rounded,
                    tone: PushTone.neutral,
                    loading: _widgetBusy,
                    onPressed: _pinWidget,
                  ),
                ],
              ),

              const SizedBox(height: AppSpace.sm),
              PushButton(
                label: context.t('Sign out on this phone'),
                icon: Icons.logout_rounded,
                tone: PushTone.ghost,
                onPressed: _confirmSignOut,
              ),
              const SizedBox(height: AppSpace.sm),
              PushButton(
                label: context.t('Delete account'),
                icon: Icons.delete_forever_rounded,
                tone: PushTone.red,
                loading: _deleteBusy,
                onPressed: _confirmDeleteAccount,
              ),
              const SizedBox(height: AppSpace.sm),
              Text(
                context.t('Deleting erases your words from the server. Signing out leaves them there.'),
                style: font(size: 13, weight: 600, color: c.ink2, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    required this.color,
  });
  final String value, label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.sm,
        vertical: AppSpace.md,
      ),
      child: Column(
        children: [
          Text(
            value,
            style: font(
              size: 22,
              weight: 900,
              color: color,
              height: 1,
              tabular: true,
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: font(size: 12, weight: 700, color: c.ink3, height: 1.2),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.icon,
    required this.color,
    required this.children,
    this.description,
  });

  final String title;
  final IconData icon;
  final Color color;
  final List<Widget> children;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.xxl),
      child: AppCard(
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    context.t(title),
                    style: font(
                      size: 16,
                      weight: 800,
                      color: c.ink,
                      height: 1.2,
                    ),
                  ),
                ),
              ],
            ),
            if (description != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(
                context.t(description!),
                style: font(size: 14, weight: 600, color: c.ink2, height: 1.5),
              ),
            ],
            if (children.isNotEmpty) ...[
              const SizedBox(height: AppSpace.lg),
              ...children,
            ],
          ],
        ),
      ),
    );
  }
}

/// Segmented selector built from the same surfaces as everything else, so it
/// does not drop a stock Material control into a custom screen.
class _Choice<T> extends StatelessWidget {
  const _Choice({
    required this.value,
    required this.onChanged,
    required this.options,
  });

  final T value;
  final ValueChanged<T> onChanged;
  final List<(T, String, IconData?)> options;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: c.surfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.button),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Row(
        children: [
          for (final option in options)
            Expanded(
              child: Squish(
                onTap: () => onChanged(option.$1),
                scale: .94,
                semanticLabel: context.t(option.$2),
                child: AnimatedContainer(
                  duration: AppMotion.quick,
                  curve: AppMotion.enter,
                  height: 44,
                  decoration: BoxDecoration(
                    color: option.$1 == value ? c.surface : Colors.transparent,
                    borderRadius: BorderRadius.circular(AppRadius.small),
                    border: option.$1 == value
                        ? Border.all(color: c.line, width: 1.5)
                        : null,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (option.$3 != null) ...[
                        Icon(
                          option.$3,
                          size: 17,
                          color: option.$1 == value ? c.green : c.ink3,
                        ),
                        const SizedBox(width: 6),
                      ],
                      Flexible(
                        child: Text(
                          context.t(option.$2),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: font(
                            size: 14,
                            weight: 800,
                            color: option.$1 == value ? c.ink : c.ink3,
                            height: 1.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Fourteen languages, each written in itself. A dropdown would hide thirteen
/// of them behind a tap; laid out flat they can be read at a glance, and the
/// chosen one is obvious without a label saying "selected".
class _LanguagePicker extends StatelessWidget {
  const _LanguagePicker({
    required this.value,
    required this.busy,
    required this.onChanged,
  });

  final String value;
  final bool busy;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Opacity(
      opacity: busy ? .55 : 1,
      child: Wrap(
        spacing: AppSpace.sm,
        runSpacing: AppSpace.sm,
        children: [
          for (final entry in cardLanguages.entries)
            Squish(
              onTap: busy ? null : () => onChanged(entry.key),
              semanticLabel: entry.value,
              child: AnimatedContainer(
                duration: AppMotion.quick,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpace.md,
                  vertical: AppSpace.sm,
                ),
                decoration: BoxDecoration(
                  color: entry.key == value ? c.green : c.surface,
                  borderRadius: BorderRadius.circular(AppRadius.chip),
                  border: Border.all(
                    color: entry.key == value ? c.green : c.line,
                    width: 1.5,
                  ),
                ),
                child: Text(
                  entry.value,
                  style: font(
                    size: 14,
                    weight: entry.key == value ? 800 : 600,
                    color: entry.key == value ? c.onGreen : c.ink2,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Interface language is local-only: changing it must redraw immediately and
/// must not rewrite the language in which future word meanings are stored.
class _InterfaceLanguagePicker extends StatelessWidget {
  const _InterfaceLanguagePicker({
    required this.value,
    required this.onChanged,
  });

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Wrap(
      spacing: AppSpace.sm,
      runSpacing: AppSpace.sm,
      children: [
        for (final entry in interfaceLanguages.entries)
          Squish(
            onTap: () => onChanged(entry.key),
            semanticLabel: entry.key == 'auto' ? context.t(entry.value) : entry.value,
            child: AnimatedContainer(
              duration: AppMotion.quick,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpace.md,
                vertical: AppSpace.sm,
              ),
              decoration: BoxDecoration(
                color: entry.key == value ? c.green : c.surface,
                borderRadius: BorderRadius.circular(AppRadius.chip),
                border: Border.all(
                  color: entry.key == value ? c.green : c.line,
                  width: 1.5,
                ),
              ),
              child: Text(
                entry.key == 'auto' ? context.t(entry.value) : entry.value,
                style: font(
                  size: 14,
                  weight: entry.key == value ? 800 : 600,
                  color: entry.key == value ? c.onGreen : c.ink2,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final String title, subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Semantics(
      toggled: value,
      label: context.t(title),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onChanged(!value);
        },
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t(title),
                    style: font(
                      size: 15,
                      weight: 800,
                      color: c.ink,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    context.t(subtitle),
                    style: font(
                      size: 13,
                      weight: 600,
                      color: c.ink3,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpace.lg),
            AnimatedContainer(
              duration: AppMotion.quick,
              curve: AppMotion.enter,
              height: 32,
              width: 54,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: value ? c.green : c.line,
                borderRadius: BorderRadius.circular(AppRadius.chip),
              ),
              child: AnimatedAlign(
                duration: AppMotion.quick,
                curve: AppMotion.enter,
                alignment: value ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  height: 26,
                  width: 26,
                  decoration: BoxDecoration(
                    color: c.surface,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PairDevicePage extends StatefulWidget {
  const PairDevicePage({required this.api, super.key});
  final SyncApi api;

  @override
  State<PairDevicePage> createState() => _PairDevicePageState();
}

class _PairDevicePageState extends State<PairDevicePage> {
  final _code = TextEditingController();
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _code.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  /// Opens the camera, and connects as soon as a readable code comes back.
  Future<void> _scan() async {
    final scanned = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const ScanCodePage(), fullscreenDialog: true),
    );
    final code = scanned == null ? null : PairingRequest.codeFrom(scanned);
    if (code == null || !mounted) return;
    _code.text = code;
    await _approve();
  }

  Future<void> _approve() async {
    if (_code.text.trim().length < 6) return;
    setState(() => _busy = true);
    try {
      await widget.api.approvePairing(_code.text);
      if (!mounted) return;
      final c = context.c;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            backgroundColor: c.green,
            content: Text(
              context.t('Device connected to your library'),
              style: font(size: 15, weight: 700, color: c.onGreen, height: 1.3),
            ),
          ),
        );
      Navigator.pop(context);
    } on ApiException catch (error) {
      if (!mounted) return;
      final c = context.c;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          SnackBar(
            backgroundColor: c.red,
            content: Text(
              error.message,
              style: font(size: 15, weight: 700, color: c.onRed, height: 1.3),
            ),
          ),
        );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final ready = _code.text.trim().length >= 6;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.sm,
                AppSpace.sm,
                AppSpace.gutter,
                AppSpace.sm,
              ),
              decoration: BoxDecoration(
                color: c.surface,
                border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
              ),
              child: Row(
                children: [
                  Squish(
                    onTap: () => Navigator.maybePop(context),
                    semanticLabel: context.t('Back'),
                    child: SizedBox(
                      height: 48,
                      width: 48,
                      child: Icon(
                        Icons.arrow_back_rounded,
                        color: c.ink,
                        size: 24,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      context.t('Connect a device'),
                      style: font(
                        size: 17,
                        weight: 800,
                        color: c.ink,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.gutter,
                  AppSpace.xxl,
                  AppSpace.gutter,
                  AppSpace.h1,
                ),
                children: [
                  Center(
                    child: IconTile(
                      icon: Icons.laptop_mac_rounded,
                      color: c.blue,
                      background: c.blueWash,
                      size: 72,
                    ),
                  ),
                  const SizedBox(height: AppSpace.xl),
                  Text(
                    context.t('Type the code from your computer'),
                    textAlign: TextAlign.center,
                    style: AppText.heading(c.ink),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    context.t('On Windows or in Chrome press Connect. The eight-character code expires in ten minutes and works only once.'),
                    textAlign: TextAlign.center,
                    style: AppText.bodySoft(c.ink2),
                  ),
                  const SizedBox(height: AppSpace.h1),
                  Container(
                    decoration: BoxDecoration(
                      color: c.surface,
                      borderRadius: BorderRadius.circular(AppRadius.panel),
                      border: Border.all(
                        color: ready ? c.green : c.line,
                        width: 2,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.lg,
                      vertical: AppSpace.sm,
                    ),
                    child: TextField(
                      controller: _code,
                      autofocus: true,
                      textCapitalization: TextCapitalization.characters,
                      maxLength: 8,
                      textAlign: TextAlign.center,
                      autocorrect: false,
                      enableSuggestions: false,
                      inputFormatters: [UpperCaseFormatter()],
                      style: font(
                        size: 30,
                        weight: 900,
                        color: c.ink,
                        height: 1.4,
                        letterSpacing: 8,
                        tabular: true,
                      ),
                      cursorColor: c.green,
                      decoration: InputDecoration(
                        counterText: '',
                        border: InputBorder.none,
                        hintText: context.t('ABCD2345'),
                        hintStyle: font(
                          size: 30,
                          weight: 900,
                          color: c.ink3.withValues(alpha: .4),
                          height: 1.4,
                          letterSpacing: 8,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpace.xl),
                  PushButton(
                    label: context.t('Connect securely'),
                    icon: Icons.lock_rounded,
                    loading: _busy,
                    onPressed: ready ? _approve : null,
                  ),
                  const SizedBox(height: AppSpace.md),
                  PushButton(
                    label: context.t('Scan the QR code instead'),
                    icon: Icons.qr_code_scanner_rounded,
                    tone: PushTone.neutral,
                    onPressed: _busy ? null : _scan,
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

class UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) => TextEditingValue(
    text: newValue.text.toUpperCase(),
    selection: newValue.selection,
  );
}
