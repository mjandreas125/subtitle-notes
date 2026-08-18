import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';

/// What friends have been saving, and how to find them.
///
/// Two views behind one tab: the feed, and a people search. Adding someone is
/// one-directional — you follow their words, they do not have to approve, and
/// nothing of yours becomes visible that your own sharing switch has not
/// already allowed.
class FriendsTab extends StatefulWidget {
  const FriendsTab({required this.api, required this.profile, super.key});

  final SyncApi api;
  final Profile? profile;

  @override
  State<FriendsTab> createState() => FriendsTabState();
}

class FriendsTabState extends State<FriendsTab> {
  final _search = TextEditingController();
  Timer? _debounce;

  List<FeedItem> _feed = const [];
  List<Person> _friends = const [];
  List<Person>? _results;
  bool _loading = true;
  bool _searching = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    setState(() {
      _loading = _feed.isEmpty && _friends.isEmpty;
      _error = null;
    });
    try {
      final results = await Future.wait([widget.api.feed(), widget.api.friends()]);
      if (!mounted) return;
      setState(() {
        _feed = results[0] as List<FeedItem>;
        _friends = results[1] as List<Person>;
      });
    } catch (error) {
      if (mounted && _feed.isEmpty) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() {
        _results = null;
        _searching = false;
      });
      return;
    }
    setState(() => _searching = true);
    // One request after typing stops, not one per keystroke.
    _debounce = Timer(const Duration(milliseconds: 350), () async {
      try {
        final people = await widget.api.searchPeople(value.trim());
        if (mounted && _search.text.trim() == value.trim()) {
          setState(() {
            _results = people;
            _searching = false;
          });
        }
      } catch (_) {
        if (mounted) setState(() => _searching = false);
      }
    });
  }

  Future<void> _toggleFriend(Person person) async {
    final adding = !person.following;
    setState(() {
      _results = _results
          ?.map((item) => item.id == person.id ? item.copyWith(following: adding) : item)
          .toList();
    });
    try {
      await widget.api.setFriend(person.id, add: adding);
      await reload();
      if (mounted) {
        _toast(
          adding
              ? '${person.handle} added. Their words appear in your feed.'
              : '${person.handle} removed.',
          good: adding,
        );
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _results = _results
              ?.map((item) =>
                  item.id == person.id ? item.copyWith(following: !adding) : item)
              .toList();
        });
        _toast(error.message, good: false);
      }
    }
  }

  Future<void> _toggleLike(FeedItem item) async {
    final liked = !item.liked;
    // Optimistic: a like should feel instant, and the server is the tiebreak.
    setState(() {
      _feed = _feed
          .map((entry) => entry.id == item.id
              ? entry.copyWith(
                  liked: liked,
                  likeCount: entry.likeCount + (liked ? 1 : -1),
                )
              : entry)
          .toList();
    });
    HapticFeedback.lightImpact();
    try {
      final count = await widget.api.setLike(item.id, liked: liked);
      if (!mounted) return;
      setState(() {
        _feed = _feed
            .map((entry) =>
                entry.id == item.id ? entry.copyWith(likeCount: count) : entry)
            .toList();
      });
    } on ApiException {
      if (!mounted) return;
      setState(() {
        _feed = _feed
            .map((entry) => entry.id == item.id
                ? entry.copyWith(
                    liked: !liked,
                    likeCount: entry.likeCount + (liked ? -1 : 1),
                  )
                : entry)
            .toList();
      });
    }
  }

  void _toast(String message, {required bool good}) {
    final c = context.c;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: good ? c.green : c.red,
          content: Text(
            message,
            style: font(
              size: 15,
              weight: 700,
              color: good ? c.onGreen : c.onRed,
              height: 1.3,
            ),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final searching = _results != null || _searching;

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
          child: Column(
            children: [
              Row(
                children: [
                  IconTile(
                    icon: Icons.people_alt_rounded,
                    color: c.onPurple,
                    background: c.purple,
                    size: 36,
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Text(
                      context.t('Friends'),
                      style: AppText.heading(c.ink),
                    ),
                  ),
                  if (_friends.isNotEmpty)
                    Pill(
                      label: '${_friends.length}',
                      color: c.purple,
                      background: c.purpleWash,
                    ),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              _SearchField(
                controller: _search,
                onChanged: _onQueryChanged,
                onClear: () {
                  _search.clear();
                  _onQueryChanged('');
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: searching
              ? _searchResults(c)
              : RefreshIndicator(
                  onRefresh: reload,
                  color: c.green,
                  backgroundColor: c.surface,
                  child: _feedList(c),
                ),
        ),
      ],
    );
  }

  Widget _searchResults(AppColors c) {
    if (_searching && _results == null) {
      return Center(child: CircularProgressIndicator(color: c.green));
    }
    final people = _results ?? const <Person>[];
    if (people.isEmpty) {
      return EmptyState(
        icon: Icons.person_search_rounded,
        title: context.t('Nobody found'),
        message: context.t('People are found by nickname. Ask your friend which one they picked in Subtitle Notes.'),
        tone: c.purple,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.lg,
        AppSpace.gutter,
        AppSpace.h1,
      ),
      itemCount: people.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
      itemBuilder: (context, index) => _PersonRow(
        person: people[index],
        onToggle: () => _toggleFriend(people[index]),
      ),
    );
  }

  Widget _feedList(AppColors c) {
    if (_loading && _feed.isEmpty) {
      return const SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpace.gutter,
          AppSpace.lg,
          AppSpace.gutter,
          AppSpace.xxl,
        ),
        child: CardSkeleton(count: 3),
      );
    }
    if (_error != null && _feed.isEmpty) {
      return _scrollable(
        EmptyState(
          icon: Icons.cloud_off_rounded,
          title: context.t('No connection'),
          message: context.t('Pull down once you are back online.'),
          tone: c.blue,
        ),
      );
    }
    if (_feed.isEmpty) {
      return _scrollable(
        EmptyState(
          icon: Icons.people_alt_rounded,
          title: context.t('Your feed is empty'),
          message: context.t('Search a nickname above to add someone. Words you both save show up here, and you can like them.'),
          tone: c.purple,
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(
        AppSpace.gutter,
        AppSpace.lg,
        AppSpace.gutter,
        AppSpace.h1,
      ),
      itemCount: _feed.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
      itemBuilder: (context, index) => _FeedCard(
        item: _feed[index],
        onLike: () => _toggleLike(_feed[index]),
      ),
    );
  }

  Widget _scrollable(Widget child) => LayoutBuilder(
    builder: (context, constraints) => SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: constraints.maxHeight),
        child: child,
      ),
    ),
  );
}

class _SearchField extends StatelessWidget {
  const _SearchField({
    required this.controller,
    required this.onChanged,
    required this.onClear,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: c.surfaceAlt,
        borderRadius: BorderRadius.circular(AppRadius.button),
        border: Border.all(color: c.line, width: 1.5),
      ),
      child: Row(
        children: [
          const SizedBox(width: AppSpace.md),
          Icon(Icons.search_rounded, size: 19, color: c.ink3),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              cursorColor: c.green,
              textInputAction: TextInputAction.search,
              autocorrect: false,
              style: font(size: 15, weight: 600, color: c.ink, height: 1.3),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: context.t('Find someone by nickname'),
                hintStyle: font(
                  size: 15,
                  weight: 600,
                  color: c.ink3,
                  height: 1.3,
                ),
              ),
            ),
          ),
          if (controller.text.isNotEmpty)
            Squish(
              onTap: onClear,
              semanticLabel: context.t('Clear search'),
              child: SizedBox(
                height: 44,
                width: 44,
                child: Icon(Icons.close_rounded, size: 18, color: c.ink3),
              ),
            )
          else
            const SizedBox(width: AppSpace.md),
        ],
      ),
    );
  }
}

class _PersonRow extends StatelessWidget {
  const _PersonRow({required this.person, required this.onToggle});

  final Person person;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppCard(
      padding: const EdgeInsets.all(AppSpace.md),
      child: Row(
        children: [
          _Avatar(handle: person.handle),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  person.handle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(size: 16, weight: 800, color: c.ink, height: 1.2),
                ),
                const SizedBox(height: 2),
                Text(
                  person.wordCount == 1
                      ? '1 word saved'
                      : '${person.wordCount} words saved',
                  style: AppText.caption(c.ink3),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          PushButton(
            label: person.following ? 'Added' : 'Add',
            icon: person.following
                ? Icons.check_rounded
                : Icons.person_add_alt_1_rounded,
            tone: person.following ? PushTone.neutral : PushTone.green,
            expand: false,
            compact: true,
            onPressed: onToggle,
          ),
        ],
      ),
    );
  }
}

class _FeedCard extends StatelessWidget {
  const _FeedCard({required this.item, required this.onLike});

  final FeedItem item;
  final VoidCallback onLike;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = c.accentFor(item.mediaTitle);

    return AppCard(
      raised: true,
      padding: const EdgeInsets.all(AppSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              _Avatar(handle: item.authorHandle, size: 32),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Row(
                  children: [
                    Flexible(
                      child: Text(
                        item.mine ? 'You' : item.authorHandle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: font(
                          size: 14,
                          weight: 800,
                          color: c.ink,
                          height: 1.2,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '· ${item.age}',
                      style: font(
                        size: 12,
                        weight: 700,
                        color: c.ink3,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                height: 8,
                width: 8,
                decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
              ),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 120),
                child: Text(
                  item.mediaTitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: font(
                    size: 12,
                    weight: 700,
                    color: c.ink3,
                    height: 1.2,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Text(item.word, style: AppText.word(c.ink)),
          const SizedBox(height: AppSpace.xs),
          Text(
            item.meaning,
            style: font(size: 15, weight: 600, color: c.ink2, height: 1.4),
          ),
          if (item.line != null) ...[
            const SizedBox(height: AppSpace.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(
                AppSpace.md,
                AppSpace.sm,
                AppSpace.md,
                AppSpace.sm,
              ),
              decoration: BoxDecoration(
                color: c.surfaceAlt,
                borderRadius: BorderRadius.circular(AppRadius.small),
                border: Border(
                  left: BorderSide(
                    color: accent.withValues(alpha: .5),
                    width: 3,
                  ),
                ),
              ),
              child: Text(
                item.line!,
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
          const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Squish(
                onTap: onLike,
                scale: .9,
                semanticLabel: item.liked ? 'Remove like' : 'Like this word',
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpace.md,
                    vertical: AppSpace.sm,
                  ),
                  decoration: BoxDecoration(
                    color: item.liked ? c.redWash : c.surfaceAlt,
                    borderRadius: BorderRadius.circular(AppRadius.chip),
                    border: Border.all(
                      color: item.liked
                          ? c.red.withValues(alpha: .35)
                          : c.line,
                      width: 1.5,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedScale(
                        scale: item.liked ? 1.15 : 1,
                        duration: AppMotion.quick,
                        curve: AppMotion.spring,
                        child: Icon(
                          item.liked
                              ? Icons.favorite_rounded
                              : Icons.favorite_border_rounded,
                          size: 17,
                          color: item.liked ? c.red : c.ink3,
                        ),
                      ),
                      if (item.likeCount > 0) ...[
                        const SizedBox(width: 6),
                        Text(
                          '${item.likeCount}',
                          style: font(
                            size: 13,
                            weight: 800,
                            color: item.liked ? c.red : c.ink2,
                            height: 1.2,
                            tabular: true,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Initial on a tinted tile, coloured from the handle so each person keeps the
/// same colour everywhere.
class _Avatar extends StatelessWidget {
  const _Avatar({required this.handle, this.size = 44});

  final String handle;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final accent = c.accentFor(handle);
    return Container(
      height: size,
      width: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: .16),
        borderRadius: BorderRadius.circular(size * .34),
        border: Border.all(color: accent.withValues(alpha: .4), width: 1.5),
      ),
      child: Text(
        handle.isEmpty ? '?' : handle.characters.first.toUpperCase(),
        style: font(
          size: size * .42,
          weight: 900,
          color: accent,
          height: 1,
        ),
      ),
    );
  }
}
