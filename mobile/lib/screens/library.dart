import 'package:flutter/material.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'detail.dart';
import 'review.dart';

class LibraryTab extends StatefulWidget {
  const LibraryTab({
    required this.cards,
    required this.stats,
    required this.settings,
    required this.loading,
    required this.error,
    required this.offline,
    required this.api,
    required this.onReload,
    required this.onArchive,
    required this.onDelete,
    required this.onSettingsChanged,
    super.key,
  });

  final List<StudyCard> cards;
  final StudyStats stats;
  final AppSettings settings;
  final bool loading;
  final Object? error;
  final bool offline;
  final SyncApi api;
  final Future<void> Function() onReload;
  final Future<bool> Function(StudyCard) onArchive;
  final Future<bool> Function(StudyCard) onDelete;
  final ValueChanged<AppSettings> onSettingsChanged;

  @override
  State<LibraryTab> createState() => _LibraryTabState();
}

class _LibraryTabState extends State<LibraryTab> {
  final _search = TextEditingController();
  String _query = '';

  /// How many words are waiting to be met again. Fetched here rather than in
  /// the shell because it changes on its own - a word saved yesterday becomes
  /// due today without anything happening in the app.
  int _due = 0;

  @override
  void initState() {
    super.initState();
    _countDue();
  }

  @override
  void didUpdateWidget(covariant LibraryTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    // The first load arrives after this tab is built, and an empty library has
    // nothing due.
    if (oldWidget.cards.length != widget.cards.length) _countDue();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _countDue() async {
    if (widget.cards.isEmpty) {
      if (mounted && _due != 0) setState(() => _due = 0);
      return;
    }
    try {
      final due = await widget.api.due();
      if (mounted) setState(() => _due = due.length);
    } catch (_) {
      // Offline: the banner simply does not appear.
    }
  }

  Future<void> _practise() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<int>(builder: (_) => ReviewPage(api: widget.api)));
    await _countDue();
  }

  /// Matches the word, its meaning, the line it came from and the title, so
  /// "the film where they said that" is as good a way in as the word itself.
  bool _matches(StudyCard card) {
    if (_query.isEmpty) return true;
    final haystack = [
      card.learningLabel,
      card.focusWord ?? '',
      card.focusPhrase ?? '',
      card.focusTranslation ?? '',
      card.translation,
      card.selectedText,
      card.mediaTitle,
      ...card.synonyms,
    ].join(' ').toLowerCase();
    return _query
        .split(' ')
        .where((word) => word.isNotEmpty)
        .every(haystack.contains);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final settings = widget.settings;
    final simple = settings.simpleMode;
    final cards = widget.cards.where(_matches).toList();
    final stats = widget.stats;
    final groups = <String, List<StudyCard>>{};
    for (final card in cards) {
      (groups[card.mediaTitle] ??= []).add(card);
    }

    return Column(
      children: [
        _TopBar(
          offline: widget.offline,
          layout: settings.libraryLayout,
          onToggleLayout: () => widget.onSettingsChanged(
            settings.copyWith(
              libraryLayout: settings.libraryLayout == LibraryLayout.list
                  ? LibraryLayout.grid
                  : LibraryLayout.list,
            ),
          ),
        ),
        _SearchField(
          controller: _search,
          onChanged: (value) =>
              setState(() => _query = value.trim().toLowerCase()),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: widget.onReload,
            color: c.green,
            backgroundColor: c.surface,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (widget.loading && cards.isEmpty)
                  const SliverPadding(
                    padding: EdgeInsets.fromLTRB(
                      AppSpace.gutter,
                      AppSpace.lg,
                      AppSpace.gutter,
                      AppSpace.xxl,
                    ),
                    sliver: SliverToBoxAdapter(child: CardSkeleton()),
                  )
                else if (widget.error != null && cards.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.cloud_off_rounded,
                      title: context.t('No connection'),
                      message: context.t(
                        'Your library is safe in the cloud. Pull down or try again once you are back online.',
                      ),
                      tone: c.blue,
                      action: PushButton(
                        label: context.t('Try again'),
                        icon: Icons.refresh_rounded,
                        tone: PushTone.blue,
                        expand: false,
                        onPressed: widget.onReload,
                      ),
                    ),
                  )
                else if (cards.isEmpty && _query.isNotEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(
                      icon: Icons.search_off_rounded,
                      title: context.t('Nothing matches'),
                      message: context.t(
                        'Try part of the word, its meaning, or the name of what you were watching.',
                      ),
                    ),
                  )
                else if (cards.isEmpty)
                  const SliverToBoxAdapter(child: _FirstRun())
                else ...[
                  if (_due > 0)
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpace.gutter,
                        AppSpace.lg,
                        AppSpace.gutter,
                        0,
                      ),
                      sliver: SliverToBoxAdapter(
                        child: _PractiseCard(count: _due, onStart: _practise),
                      ),
                    ),
                  if (!simple) ...[
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpace.gutter,
                        AppSpace.lg,
                        AppSpace.gutter,
                        0,
                      ),
                      sliver: SliverToBoxAdapter(
                        child: _AchievementCard(stats: stats),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpace.gutter,
                        AppSpace.md,
                        AppSpace.gutter,
                        0,
                      ),
                      sliver: SliverToBoxAdapter(child: _StatRow(stats: stats)),
                    ),
                  ],
                  if (!simple && !settings.tipDismissed)
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpace.gutter,
                        AppSpace.md,
                        AppSpace.gutter,
                        0,
                      ),
                      sliver: SliverToBoxAdapter(
                        child: _TipCard(
                          onClose: () => widget.onSettingsChanged(
                            settings.copyWith(tipDismissed: true),
                          ),
                        ),
                      ),
                    ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpace.gutter,
                      0,
                      AppSpace.gutter,
                      AppSpace.h1,
                    ),
                    sliver: SliverList.builder(
                      itemCount: groups.length,
                      itemBuilder: (context, index) {
                        final group = groups.entries.elementAt(index);
                        return _SourceSection(
                          // Keyed by source, not by position. Without this the
                          // sliver reuses the element at index 0 when a group
                          // empties out, and the incoming section inherits the
                          // collapsed state of the row that was just removed.
                          key: ValueKey(group.key),
                          title: group.key,
                          cards: group.value,
                          settings: settings,
                          api: widget.api,
                          onArchive: widget.onArchive,
                          onDelete: widget.onDelete,
                          onChanged: widget.onReload,
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.offline,
    required this.layout,
    required this.onToggleLayout,
  });

  final bool offline;
  final LibraryLayout layout;
  final VoidCallback onToggleLayout;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.md,
        AppSpace.md,
        AppSpace.md,
      ),
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(bottom: BorderSide(color: c.line, width: 1.5)),
      ),
      child: Row(
        children: [
          IconTile(
            icon: Icons.subtitles_rounded,
            color: c.onGreen,
            background: c.green,
            size: 36,
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Text(context.t('Library'), style: AppText.heading(c.ink)),
          ),
          if (offline) ...[
            Pill(
              label: context.t('Offline'),
              icon: Icons.cloud_off_rounded,
              color: c.amberLip,
              background: c.amberWash,
              dense: true,
            ),
            const SizedBox(width: AppSpace.sm),
          ],
          Squish(
            onTap: onToggleLayout,
            semanticLabel: layout == LibraryLayout.list
                ? 'Switch to grid layout'
                : 'Switch to list layout',
            child: SizedBox(
              height: 44,
              width: 44,
              child: Icon(
                layout == LibraryLayout.list
                    ? Icons.grid_view_rounded
                    : Icons.view_agenda_rounded,
                color: c.ink2,
                size: 22,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Every achievement, opened from the card on the library. Nothing here is
/// news to the user - it is the same list the card summarises, in full.
Future<void> showAchievements(BuildContext context, StudyStats stats) {
  final c = context.c;
  return showDialog<void>(
    context: context,
    builder: (context) => Dialog(
      backgroundColor: c.surface,
      insetPadding: const EdgeInsets.all(AppSpace.lg),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.sheet),
        side: BorderSide(color: c.line, width: 1.5),
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * .82,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpace.xxl,
                AppSpace.xxl,
                AppSpace.lg,
                AppSpace.md,
              ),
              child: Row(
                children: [
                  IconTile(
                    icon: Icons.emoji_events_rounded,
                    color: c.amber,
                    background: c.amberWash,
                    size: 44,
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.t('Achievements'),
                          style: AppText.heading(c.ink),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${stats.unlocked} unlocked',
                          style: AppText.caption(c.ink3),
                        ),
                      ],
                    ),
                  ),
                  Squish(
                    onTap: () => Navigator.pop(context),
                    child: IconTile(
                      icon: Icons.close_rounded,
                      color: c.ink3,
                      background: c.surfaceAlt,
                      size: 38,
                    ),
                  ),
                ],
              ),
            ),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.xxl,
                  0,
                  AppSpace.xxl,
                  AppSpace.xxl,
                ),
                itemCount: stats.achievements.length,
                separatorBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
                  child: Divider(color: c.line, height: 1.5, thickness: 1.5),
                ),
                itemBuilder: (context, index) =>
                    AchievementRow(achievement: stats.achievements[index]),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// The achievement closest to its next level, and the way into all of them.
/// No dates, no expiry - it only ever shows how far along something is.
class _AchievementCard extends StatelessWidget {
  const _AchievementCard({required this.stats});

  final StudyStats stats;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final next = stats.nextUp;

    if (next == null) {
      return Squish(
        onTap: () => showAchievements(context, stats),
        child: AppCard(
          raised: true,
          color: c.greenWash,
          borderColor: c.green.withValues(alpha: .35),
          child: Row(
            children: [
              IconTile(
                icon: Icons.emoji_events_rounded,
                color: c.amber,
                background: c.amberWash,
                size: 44,
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.t('Everything unlocked'),
                      style: AppText.word(c.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'All ${stats.unlocked} levels. Keep saving what you like.',
                      style: AppText.caption(c.ink2),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Squish(
      onTap: () => showAchievements(context, stats),
      child: AppCard(
        raised: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  context.t('CLOSEST ACHIEVEMENT'),
                  style: font(
                    size: 11,
                    weight: 800,
                    color: c.ink3,
                    height: 1.2,
                    letterSpacing: 1.1,
                  ),
                ),
                const Spacer(),
                Text(
                  '${stats.unlocked} unlocked',
                  style: font(
                    size: 11,
                    weight: 800,
                    color: c.ink3,
                    height: 1.2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.md),
            AchievementRow(achievement: next),
          ],
        ),
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow({required this.stats});
  final StudyStats stats;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(
      children: [
        Expanded(
          child: _StatTile(
            value: '${stats.total}',
            label: context.t('saved'),
            icon: Icons.style_rounded,
            color: c.green,
            wash: c.greenWash,
          ),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: _StatTile(
            value: '${stats.sources}',
            label: context.t('sources'),
            icon: Icons.movie_rounded,
            color: c.purple,
            wash: c.purpleWash,
          ),
        ),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: _StatTile(
            value: '${stats.learned}',
            label: context.t('learned'),
            icon: Icons.workspace_premium_rounded,
            color: c.blue,
            wash: c.blueWash,
          ),
        ),
      ],
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({
    required this.value,
    required this.label,
    required this.icon,
    required this.color,
    required this.wash,
  });

  final String value, label;
  final IconData icon;
  final Color color, wash;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpace.md,
        vertical: AppSpace.md,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(height: AppSpace.sm),
          Text(
            value,
            style: font(
              size: 22,
              weight: 900,
              color: c.ink,
              height: 1,
              tabular: true,
            ),
          ),
          const SizedBox(height: 2),
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

class _TipCard extends StatelessWidget {
  const _TipCard({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      color: c.blueWash,
      borderColor: c.blue.withValues(alpha: .3),
      padding: const EdgeInsets.fromLTRB(
        AppSpace.md,
        AppSpace.md,
        AppSpace.sm,
        AppSpace.md,
      ),
      child: Row(
        children: [
          Icon(Icons.lightbulb_rounded, color: c.blue, size: 20),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Text(
              context.t(
                'Select text anywhere, then pick Subtitle Notes from the menu.',
              ),
              style: font(size: 13, weight: 700, color: c.ink2, height: 1.4),
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Squish(
            onTap: onClose,
            semanticLabel: context.t('Dismiss this hint'),
            child: SizedBox(
              height: 36,
              width: 36,
              child: Icon(Icons.close_rounded, size: 18, color: c.ink3),
            ),
          ),
        ],
      ),
    );
  }
}

/// The way back into practice. Only shown when something is actually due, so
/// it is never a permanent nag: an empty day leaves the library as it was.
class _PractiseCard extends StatelessWidget {
  const _PractiseCard({required this.count, required this.onStart});

  final int count;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      raised: true,
      color: c.greenWash,
      borderColor: c.green.withValues(alpha: .35),
      child: Row(
        children: [
          IconTile(
            icon: Icons.psychology_rounded,
            color: c.green,
            background: c.surface,
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  count == 1 ? '1 word to revisit' : '$count words to revisit',
                  style: font(size: 16, weight: 800, color: c.ink),
                ),
                const SizedBox(height: AppSpace.xxs),
                Text(
                  context.t('Two minutes now beats reading the list again.'),
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
          const SizedBox(width: AppSpace.md),
          PushButton(
            label: context.t('Start'),
            expand: false,
            compact: true,
            onPressed: onStart,
          ),
        ],
      ),
    );
  }
}

/// What a brand new account sees. An empty list with a cheerful line was fine
/// for the person who built the thing and useless to everybody else: this says
/// where words actually come from, in the three places they can come from.
class _FirstRun extends StatelessWidget {
  const _FirstRun();

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    const steps = [
      (
        Icons.phone_iphone_rounded,
        'On this phone',
        'Select text in any app, tap Share, then Subtitle Notes.',
      ),
      (
        Icons.desktop_windows_rounded,
        'On a computer',
        'Subtitles in VLC and text in PDFs, through the Windows program.',
      ),
      (
        Icons.public_rounded,
        'In the browser',
        'The extension makes web subtitles clickable and saves anything you '
            'highlight.',
      ),
      // The three ways in, translated where they are drawn: the list itself is
      // const and has no context to ask.
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.xxl,
        AppSpace.gutter,
        AppSpace.h1,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.t('Your library starts empty'),
            style: font(size: 26, weight: 800, color: c.ink, height: 1.15),
          ),
          const SizedBox(height: AppSpace.sm),
          Text(
            context.t(
              'Words land here from anywhere you are signed in with the same Google account.',
            ),
            style: font(size: 15, weight: 600, color: c.ink3, height: 1.4),
          ),
          const SizedBox(height: AppSpace.xxl),
          for (final (icon, title, body) in steps)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.md),
              child: AppCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconTile(
                      icon: icon,
                      color: c.accentFor(title),
                      background: c.surfaceAlt,
                    ),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.t(title),
                            style: font(size: 16, weight: 800, color: c.ink),
                          ),
                          const SizedBox(height: AppSpace.xxs),
                          Text(
                            context.t(body),
                            style: font(
                              size: 14,
                              weight: 600,
                              color: c.ink3,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: AppSpace.sm),
          Text(
            context.t(
              'The computer and the browser are connected from You → Connected devices.',
            ),
            style: font(size: 13, weight: 600, color: c.ink3, height: 1.4),
          ),
        ],
      ),
    );
  }
}

class _SourceSection extends StatelessWidget {
  const _SourceSection({
    required super.key,
    required this.title,
    required this.cards,
    required this.settings,
    required this.api,
    required this.onArchive,
    required this.onDelete,
    required this.onChanged,
  });

  final String title;
  final List<StudyCard> cards;
  final AppSettings settings;
  final SyncApi api;
  final Future<bool> Function(StudyCard) onArchive;
  final Future<bool> Function(StudyCard) onDelete;
  final Future<void> Function() onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = c.accentFor(title);
    final grid = settings.libraryLayout == LibraryLayout.grid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.xs,
            AppSpace.xxl,
            AppSpace.xs,
            AppSpace.md,
          ),
          child: Row(
            children: [
              Container(
                height: 10,
                width: 10,
                decoration: BoxDecoration(
                  color: accent,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(size: 15, weight: 800, color: c.ink, height: 1.2),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Text(
                '${cards.length}',
                style: font(size: 13, weight: 800, color: c.ink3, height: 1.2),
              ),
            ],
          ),
        ),
        if (grid)
          GridView.builder(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: cards.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: AppSpace.md,
              mainAxisSpacing: AppSpace.md,
              childAspectRatio: .95,
            ),
            itemBuilder: (context, index) => _swipeable(cards[index], true),
          )
        else
          for (final card in cards)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.md),
              child: _swipeable(card, false),
            ),
      ],
    );
  }

  Widget _swipeable(StudyCard card, bool grid) => Builder(
    builder: (context) {
      final c = context.c;
      return SwipeRow(
        // Ties the swipe state to the card itself, so a removed row can never
        // hand its collapse animation to whichever card takes its place.
        key: ValueKey('swipe-${card.id}'),
        radius: AppRadius.card,
        startAction: SwipeAction(
          icon: Icons.workspace_premium_rounded,
          label: context.t('Learned'),
          color: c.green,
          onTriggered: () => onArchive(card),
        ),
        endAction: SwipeAction(
          icon: Icons.delete_rounded,
          label: context.t('Delete'),
          color: c.red,
          // Deleting is the one action with no way back: the archive can
          // restore a learned word, but a deleted one is gone from every
          // device. One tap to confirm is worth it.
          confirm: () => confirmDestructive(
            context,
            title: 'Delete “${card.learningLabel}”?',
            message: context.t(
              'This removes it from every device signed in to your account. To retire a word you already know, swipe right instead.',
            ),
            confirmLabel: context.t('Delete'),
            cancelLabel: context.t('Keep it'),
          ),
          onTriggered: () => onDelete(card),
        ),
        child: StudyCardTile(
          card: card,
          compact: grid || settings.compactCards,
          accent: c.accentFor(card.mediaTitle),
          showContext: settings.showOriginal && !grid,
          onTap: () async {
            final changed = await Navigator.push<bool>(
              context,
              MaterialPageRoute(
                builder: (_) => DetailPage(api: api, card: card),
              ),
            );
            if (changed == true) await onChanged();
          },
        ),
      );
    },
  );
}

/// One saved word. The headword leads, its meaning sits directly under it, and
/// the source details drop to a chip row so they never crowd the reading line.
class StudyCardTile extends StatelessWidget {
  const StudyCardTile({
    required this.card,
    required this.accent,
    this.compact = false,
    this.showContext = true,
    this.onTap,
    this.trailing,
    super.key,
  });

  final StudyCard card;
  final Color accent;
  final bool compact;
  final bool showContext;
  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final chips = card.sourceChips;
    final context_ = card.contextLine;

    return TiltMedallion(
      child: Squish(
        onTap: onTap,
        semanticLabel: '${card.learningLabel}. ${card.primaryMeaning}',
        child: Container(
          decoration: BoxDecoration(
            color: c.lip,
            borderRadius: BorderRadius.circular(AppRadius.card),
          ),
          padding: const EdgeInsets.only(bottom: AppLip.card),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.card),
            child: Container(
              decoration: BoxDecoration(
                color: c.surface,
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(color: c.line, width: 1.5),
              ),
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(width: 6, color: accent),
                    Expanded(
                      child: Padding(
                        padding: EdgeInsets.fromLTRB(
                          AppSpace.lg,
                          compact ? AppSpace.md : AppSpace.lg,
                          AppSpace.lg,
                          compact ? AppSpace.md : AppSpace.lg,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Text(
                                    card.learningLabel,
                                    maxLines: compact ? 2 : 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: compact
                                        ? font(
                                            size: 17,
                                            weight: 800,
                                            color: c.ink,
                                            height: 1.2,
                                          )
                                        : AppText.word(c.ink),
                                  ),
                                ),
                                if (trailing != null) ...[
                                  const SizedBox(width: AppSpace.sm),
                                  trailing!,
                                ],
                              ],
                            ),
                            const SizedBox(height: AppSpace.xs),
                            Text(
                              card.primaryMeaning,
                              maxLines: compact ? 2 : 3,
                              overflow: TextOverflow.ellipsis,
                              style: font(
                                size: compact ? 14 : 15,
                                weight: 600,
                                color: c.ink2,
                                height: 1.4,
                              ),
                            ),
                            if (showContext && context_ != null) ...[
                              const SizedBox(height: AppSpace.md),
                              Container(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpace.md,
                                  AppSpace.sm,
                                  AppSpace.md,
                                  AppSpace.sm,
                                ),
                                decoration: BoxDecoration(
                                  color: c.surfaceAlt,
                                  borderRadius: BorderRadius.circular(
                                    AppRadius.small,
                                  ),
                                  border: Border(
                                    left: BorderSide(
                                      color: accent.withValues(alpha: .5),
                                      width: 3,
                                    ),
                                  ),
                                ),
                                child: Text(
                                  context_,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: font(
                                    size: 13,
                                    weight: 600,
                                    color: c.ink3,
                                    height: 1.4,
                                    italic: true,
                                  ),
                                ),
                              ),
                            ],
                            if (chips.isNotEmpty) ...[
                              SizedBox(
                                height: compact ? AppSpace.sm : AppSpace.md,
                              ),
                              Wrap(
                                spacing: AppSpace.sm,
                                runSpacing: AppSpace.xs,
                                children: [
                                  for (final chip in chips)
                                    Pill(
                                      label: chip,
                                      color: c.ink3,
                                      background: c.surfaceAlt,
                                      dense: true,
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// One line above the library. Typing narrows the list as you go, because a
/// list of a few hundred words stops being browsable long before it stops
/// being useful.
class _SearchField extends StatelessWidget {
  const _SearchField({required this.controller, required this.onChanged});

  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.sm,
        AppSpace.gutter,
        0,
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        textInputAction: TextInputAction.search,
        style: font(size: 15, weight: 600, color: c.ink),
        decoration: InputDecoration(
          isDense: true,
          hintText: context.t('Search your words'),
          hintStyle: font(size: 15, weight: 600, color: c.ink2),
          prefixIcon: Icon(Icons.search_rounded, color: c.ink2, size: 21),
          suffixIcon: ValueListenableBuilder<TextEditingValue>(
            valueListenable: controller,
            builder: (context, value, _) => value.text.isEmpty
                ? const SizedBox.shrink()
                : IconButton(
                    icon: Icon(Icons.close_rounded, color: c.ink2, size: 20),
                    onPressed: () {
                      controller.clear();
                      onChanged('');
                    },
                  ),
          ),
          filled: true,
          fillColor: c.surface,
          contentPadding: const EdgeInsets.symmetric(vertical: 13),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
            borderSide: BorderSide(color: c.line, width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
            borderSide: BorderSide(color: c.line, width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
            borderSide: BorderSide(color: c.green, width: 2),
          ),
        ),
      ),
    );
  }
}
