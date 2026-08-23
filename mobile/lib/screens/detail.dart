import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart';
import '../i18n.dart';
import '../design/components.dart';
import '../design/tokens.dart';

/// The full study card: headword hero, meaning, then everything the desktop
/// helper collected around it.
class DetailPage extends StatefulWidget {
  const DetailPage({required this.api, required this.card, super.key});
  final SyncApi api;
  final StudyCard card;

  @override
  State<DetailPage> createState() => _DetailPageState();
}

class _DetailPageState extends State<DetailPage> {
  StudyDetail? _detail;
  Object? _error;
  bool _busy = false;
  bool _rereading = false;

  /// True when what is on screen came out of the cache rather than the server.
  bool _fromCache = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      _detail = await widget.api.detail(widget.card.id);
      _fromCache = false;
    } catch (error) {
      // No signal. A card opened before is kept on the phone, and reading it
      // again is the whole point of having saved it.
      final cached = await DetailCache.load(widget.card.id);
      if (cached != null) {
        _detail = StudyDetail.fromJson(cached);
        _fromCache = true;
      } else {
        _error = error;
      }
    }
    if (mounted) setState(() {});
  }

  /// Writing the meaning yourself, when the model got it wrong.
  ///
  /// The reader is often the one who knows: they have the film in front of
  /// them. Their own card changes immediately, and if enough people write the
  /// same thing for the same expression it becomes what everybody gets.
  Future<void> _writeMyOwn() async {
    final field = TextEditingController(
      text: _detail?.primaryMeaning ?? widget.card.primaryMeaning,
    );
    final c = context.c;
    final text = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: c.surface,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.panelR),
        title: Text(
          context.t('What does it mean here?'),
          style: font(size: 19, weight: 800, color: c.ink),
        ),
        content: TextField(
          controller: field,
          autofocus: true,
          maxLength: 120,
          style: font(size: 16, weight: 600, color: c.ink),
          decoration: InputDecoration(
            hintText: context.t('Your wording'),
            hintStyle: font(size: 16, weight: 600, color: c.ink3),
          ),
          onSubmitted: (value) => Navigator.pop(dialogContext, value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              context.t('Cancel'),
              style: font(size: 15, weight: 700, color: c.ink3),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, field.text),
            child: Text(
              context.t('Save'),
              style: font(size: 15, weight: 800, color: c.green),
            ),
          ),
        ],
      ),
    );
    field.dispose();
    if (text == null || text.trim().isEmpty || !mounted) return;
    setState(() => _rereading = true);
    try {
      final answer = await widget.api.suggest(widget.card.id, text);
      if (!mounted) return;
      setState(() {
        _detail = answer.card;
        _fromCache = false;
      });
      _tell(
        answer.votes >= answer.quorum
            ? context.t('Saved - enough people agree, so this is the default now.')
            : context.t('Saved. If others write the same, it becomes the default.'),
      );
    } on ApiException catch (error) {
      _report(error.message);
    } catch (_) {
      _report(context.t('No connection — try again later.'));
    } finally {
      if (mounted) setState(() => _rereading = false);
    }
  }

  /// Asks the server to work the line out again. The fast model answers while
  /// a film is paused; this is the slower one, which reads idioms better.
  Future<void> _reread() async {
    setState(() => _rereading = true);
    try {
      final fresh = await widget.api.reread(widget.card.id);
      if (!mounted) return;
      setState(() {
        _detail = fresh;
        _fromCache = false;
      });
      _tell('Read again: “${fresh.primaryMeaning}”');
    } on ApiException catch (error) {
      _report(error.message);
    } catch (_) {
      _report(context.t('No connection — try again later.'));
    } finally {
      if (mounted) setState(() => _rereading = false);
    }
  }

  Future<void> _archive() async {
    setState(() => _busy = true);
    try {
      await widget.api.setArchived(widget.card.id, archived: true);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      _report(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await confirmDestructive(
      context,
      title: context.t('Delete this word?'),
      message: context.t('It is removed from every device signed in to your account.'),
      confirmLabel: context.t('Delete'),
      cancelLabel: context.t('Keep it'),
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.api.delete(widget.card.id);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (error) {
      _report(error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _report(String message) {
    if (!mounted) return;
    final c = context.c;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: c.red,
          content: Text(
            message,
            style: font(size: 15, weight: 700, color: c.onRed, height: 1.3),
          ),
        ),
      );
  }

  void _tell(String message) {
    if (!mounted) return;
    final c = context.c;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          backgroundColor: c.green,
          content: Text(
            message,
            style: font(size: 15, weight: 700, color: c.onGreen, height: 1.3),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final card = widget.card;
    final item = _detail;
    final accent = c.accentFor(card.mediaTitle);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _Header(title: card.mediaTitle, accent: accent),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(
                  AppSpace.gutter,
                  AppSpace.lg,
                  AppSpace.gutter,
                  AppSpace.h1,
                ),
                children: [
                  _Hero(card: card, accent: accent),
                  if (card.sourceChips.isNotEmpty) ...[
                    const SizedBox(height: AppSpace.md),
                    Wrap(
                      spacing: AppSpace.sm,
                      runSpacing: AppSpace.sm,
                      children: [
                        for (final chip in card.sourceChips)
                          Pill(
                            label: chip,
                            // Only the timecode gets the clock; a season or
                            // episode number is not a time.
                            icon: chip.contains(':')
                                ? Icons.schedule_rounded
                                : Icons.tv_rounded,
                            color: c.ink2,
                          ),
                      ],
                    ),
                  ],
                  const SizedBox(height: AppSpace.xxl),
                  if (item == null && _error == null)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.h2),
                      child: Center(
                        child: CircularProgressIndicator(color: c.green),
                      ),
                    )
                  else if (item == null)
                    EmptyState(
                      icon: Icons.wifi_off_rounded,
                      title: context.t('Details unavailable'),
                      message: context.t('The word is saved. Its examples need a connection.'),
                      tone: c.blue,
                      action: PushButton(
                        label: context.t('Retry'),
                        icon: Icons.refresh_rounded,
                        tone: PushTone.blue,
                        expand: false,
                        onPressed: _load,
                      ),
                    )
                  else ...[
                    if (item.synonyms.isNotEmpty)
                      _SynonymSection(
                        values: item.synonyms,
                        color: c.green,
                      ),
                    if (item.senseNote != null)
                      _TextSection(
                        title: context.t('Where it comes from'),
                        value: item.senseNote!,
                        icon: Icons.lightbulb_rounded,
                        color: c.amber,
                      ),
                    if (item.variants.isNotEmpty)
                      _ListSection(
                        title: context.t('All meanings'),
                        values: item.variants,
                        icon: Icons.alt_route_rounded,
                        color: c.blue,
                      ),
                    if (item.focusPhrase?.isNotEmpty == true &&
                        !_same(item.focusPhrase, item.focusWord))
                      _TextSection(
                        title: context.t('Useful expression'),
                        value: item.focusPhrase!,
                        icon: Icons.auto_awesome_rounded,
                        color: c.purple,
                        emphasise: true,
                      ),
                    if (item.focusWord?.isNotEmpty == true &&
                        !_same(item.focusWord, card.learningLabel))
                      _TextSection(
                        title: context.t('Key word'),
                        value: item.focusWord!,
                        icon: Icons.key_rounded,
                        color: c.amber,
                        emphasise: true,
                      ),
                    if (item.selectedText.trim().isNotEmpty &&
                        !_same(item.selectedText, card.learningLabel))
                      _TextSection(
                        title: context.t('Selected subtitle'),
                        value: item.selectedText,
                        icon: Icons.subtitles_rounded,
                        color: accent,
                      ),
                    if (!_same(item.translation, card.primaryMeaning))
                      _TextSection(
                        title: context.t('Full translation'),
                        value: item.translation,
                        icon: Icons.translate_rounded,
                        color: c.blue,
                      ),
                    if (item.examples.isNotEmpty)
                      _ExampleSection(
                        examples: item.examples,
                        color: c.green,
                      ),
                    if (item.context?.isNotEmpty == true &&
                        !_same(item.context, item.selectedText))
                      _TextSection(
                        title: context.t('Scene context'),
                        value: item.context!,
                        icon: Icons.movie_filter_rounded,
                        color: c.ink3,
                      ),
                    // The card was written by a model reading one line of
                    // dialogue, and now and then it picks the wrong sense.
                    // Saying so should cost one tap.
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xl),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (_fromCache)
                            Padding(
                              padding: const EdgeInsets.only(
                                bottom: AppSpace.md,
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.cloud_off_rounded,
                                    size: 16,
                                    color: c.ink3,
                                  ),
                                  const SizedBox(width: AppSpace.sm),
                                  Expanded(
                                    child: Text(
                                      context.t('Saved on this phone — reconnect to refresh it.'),
                                      style: font(
                                        size: 13,
                                        weight: 600,
                                        color: c.ink3,
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          Row(
                            children: [
                              Expanded(
                                child: PushButton(
                                  label: _rereading
                                      ? context.t('Reading the line again…')
                                      : context.t('Wrong translation?'),
                                  icon: Icons.refresh_rounded,
                                  tone: PushTone.neutral,
                                  loading: _rereading,
                                  onPressed: _rereading ? null : _reread,
                                ),
                              ),
                              const SizedBox(width: AppSpace.sm),
                              Expanded(
                                child: PushButton(
                                  label: context.t('My wording'),
                                  icon: Icons.edit_rounded,
                                  tone: PushTone.neutral,
                                  onPressed: _rereading ? null : _writeMyOwn,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            _ActionBar(busy: _busy, onArchive: _archive, onDelete: _delete),
          ],
        ),
      ),
    );
  }

  /// Sections are dropped when they would repeat something already on screen,
  /// ignoring case and punctuation.
  bool _same(String? first, String? second) =>
      StudyCard.bare(first ?? '') == StudyCard.bare(second ?? '');
}

class _Header extends StatelessWidget {
  const _Header({required this.title, required this.accent});
  final String title;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
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
              child: Icon(Icons.arrow_back_rounded, color: c.ink, size: 24),
            ),
          ),
          const SizedBox(width: AppSpace.xs),
          Container(
            height: 10,
            width: 10,
            decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
          ),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: font(size: 16, weight: 800, color: c.ink, height: 1.2),
            ),
          ),
        ],
      ),
    );
  }
}

/// The word itself, on a solid accent panel. This is the one place in the app
/// that goes loud, because it is the thing you came to read.
class _Hero extends StatelessWidget {
  const _Hero({required this.card, required this.accent});
  final StudyCard card;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final onAccent = c.onAccent(accent);
    return Container(
      decoration: BoxDecoration(
        color: Color.lerp(accent, Colors.black, .22),
        borderRadius: BorderRadius.circular(AppRadius.panel),
      ),
      padding: const EdgeInsets.only(bottom: AppLip.button),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpace.xxl),
        decoration: BoxDecoration(
          color: accent,
          borderRadius: BorderRadius.circular(AppRadius.panel),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.bookmark_rounded,
                  size: 16,
                  color: onAccent.withValues(alpha: .8),
                ),
                const SizedBox(width: 6),
                Text(
                  context.t('SAVED WORD'),
                  style: font(
                    size: 11,
                    weight: 800,
                    color: onAccent.withValues(alpha: .8),
                    height: 1.2,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.md),
            SelectableText(
              card.learningLabel,
              style: font(
                size: 34,
                weight: 900,
                color: onAccent,
                height: 1.1,
                letterSpacing: -.8,
              ),
            ),
            const SizedBox(height: AppSpace.sm),
            SelectableText(
              card.primaryMeaning,
              style: font(
                size: 18,
                weight: 700,
                color: onAccent.withValues(alpha: .92),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TextSection extends StatelessWidget {
  const _TextSection({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.emphasise = false,
  });

  final String title, value;
  final IconData icon;
  final Color color;
  final bool emphasise;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionLabel(title: title, icon: icon, color: color),
            const SizedBox(height: AppSpace.md),
            SelectableText(
              value,
              style: emphasise
                  ? font(size: 20, weight: 800, color: c.ink, height: 1.35)
                  : font(size: 16, weight: 600, color: c.ink, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}

/// Synonyms are short and read best side by side. Three two-word phrases in a
/// bulleted column waste the width and look like a checklist of chores.
class _SynonymSection extends StatelessWidget {
  const _SynonymSection({required this.values, required this.color});

  final List<String> values;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionLabel(
              title: context.t('Same in other words'),
              icon: Icons.join_inner_rounded,
              color: color,
            ),
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final value in values)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpace.md,
                      vertical: AppSpace.sm,
                    ),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(AppRadius.chip),
                      border: Border.all(
                        color: color.withValues(alpha: .38),
                        width: 1.5,
                      ),
                    ),
                    child: Text(
                      value,
                      style: font(size: 15, weight: 700, color: c.ink),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ListSection extends StatelessWidget {
  const _ListSection({
    required this.title,
    required this.values,
    required this.icon,
    required this.color,
  });

  final String title;
  final List<String> values;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionLabel(title: title, icon: icon, color: color),
            const SizedBox(height: AppSpace.md),
            for (var index = 0; index < values.length; index++) ...[
              if (index > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: Divider(color: c.line, height: 1.5, thickness: 1.5),
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 7),
                    height: 7,
                    width: 7,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: SelectableText(
                      values[index],
                      style: font(
                        size: 16,
                        weight: 600,
                        color: c.ink,
                        height: 1.45,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Example sentences with their Russian reading underneath. The English line
/// stays the loud one — the translation is support, not the point.
class _ExampleSection extends StatelessWidget {
  const _ExampleSection({required this.examples, required this.color});

  final List<StudyExample> examples;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _SectionLabel(
              title: context.t('Examples'),
              icon: Icons.format_quote_rounded,
              color: color,
            ),
            const SizedBox(height: AppSpace.md),
            for (var index = 0; index < examples.length; index++) ...[
              if (index > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: Divider(color: c.line, height: 1.5, thickness: 1.5),
                ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 7),
                    height: 7,
                    width: 7,
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SelectableText(
                          examples[index].text,
                          style: font(
                            size: 16,
                            weight: 600,
                            color: c.ink,
                            height: 1.45,
                          ),
                        ),
                        if (examples[index].translation != null) ...[
                          const SizedBox(height: 3),
                          SelectableText(
                            examples[index].translation!,
                            style: font(
                              size: 14,
                              weight: 600,
                              color: c.ink3,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({
    required this.title,
    required this.icon,
    required this.color,
  });

  final String title;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpace.sm),
        Text(
          title,
          style: font(size: 13, weight: 800, color: c.ink2, height: 1.2),
        ),
      ],
    );
  }
}

class _ActionBar extends StatelessWidget {
  const _ActionBar({
    required this.busy,
    required this.onArchive,
    required this.onDelete,
  });

  final bool busy;
  final VoidCallback onArchive;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.line, width: 1.5)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpace.gutter,
            AppSpace.md,
            AppSpace.gutter,
            AppSpace.md,
          ),
          child: Row(
            children: [
              Expanded(
                child: PushButton(
                  label: context.t('I know this'),
                  icon: Icons.workspace_premium_rounded,
                  loading: busy,
                  onPressed: onArchive,
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Squish(
                onTap: busy
                    ? null
                    : () {
                        HapticFeedback.lightImpact();
                        onDelete();
                      },
                semanticLabel: context.t('Delete this word'),
                child: Container(
                  height: 56,
                  width: 56,
                  decoration: BoxDecoration(
                    color: c.redWash,
                    borderRadius: AppRadius.buttonR,
                    border: Border.all(
                      color: c.red.withValues(alpha: .28),
                      width: 1.5,
                    ),
                  ),
                  child: Icon(Icons.delete_rounded, color: c.red, size: 22),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
