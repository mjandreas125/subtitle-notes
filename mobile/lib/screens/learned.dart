import 'package:flutter/material.dart';

import '../data.dart';
import '../design/components.dart';
import '../design/tokens.dart';
import '../i18n.dart';
import 'library.dart';

/// Words retired from active study. Kept as a first-class tab rather than an
/// icon in a header, so the reward for learning something is visible.
class LearnedTab extends StatelessWidget {
  const LearnedTab({
    required this.cards,
    required this.loading,
    required this.error,
    required this.onReload,
    required this.onRestore,
    super.key,
  });

  final List<StudyCard> cards;
  final bool loading;
  final Object? error;
  final Future<void> Function() onReload;
  final Future<bool> Function(StudyCard) onRestore;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
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
                icon: Icons.workspace_premium_rounded,
                color: c.onAmber,
                background: c.amber,
                size: 36,
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Text(context.t('Learned'), style: AppText.heading(c.ink)),
              ),
              if (cards.isNotEmpty)
                Pill(
                  label: '${cards.length}',
                  color: c.amberLip,
                  background: c.amberWash,
                ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: onReload,
            color: c.green,
            backgroundColor: c.surface,
            child: loading && cards.isEmpty
                ? const SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(
                      AppSpace.gutter,
                      AppSpace.lg,
                      AppSpace.gutter,
                      AppSpace.xxl,
                    ),
                    child: CardSkeleton(count: 3),
                  )
                : error != null && cards.isEmpty
                ? _scrollable(
                    EmptyState(
                      icon: Icons.cloud_off_rounded,
                      title: context.t('No connection'),
                      message: context.t('Pull down once you are back online.'),
                      tone: c.blue,
                    ),
                  )
                : cards.isEmpty
                ? _scrollable(
                    EmptyState(
                      icon: Icons.workspace_premium_rounded,
                      title: context.t('Nothing retired yet'),
                      message: context.t('Swipe a card right when a word feels familiar. It moves here and stops crowding your library.'),
                      tone: c.amber,
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpace.gutter,
                      AppSpace.lg,
                      AppSpace.gutter,
                      AppSpace.h1,
                    ),
                    itemCount: cards.length,
                    separatorBuilder: (_, _) =>
                        const SizedBox(height: AppSpace.md),
                    itemBuilder: (context, index) {
                      final card = cards[index];
                      return StudyCardTile(
                        key: ValueKey('learned-${card.id}'),
                        card: card,
                        accent: c.accentFor(card.mediaTitle),
                        compact: true,
                        showContext: false,
                        trailing: Squish(
                          onTap: () => onRestore(card),
                          semanticLabel:
                              'Return ${card.learningLabel} to the library',
                          child: Container(
                            height: 34,
                            width: 34,
                            decoration: BoxDecoration(
                              color: c.blueWash,
                              borderRadius: BorderRadius.circular(
                                AppRadius.small,
                              ),
                            ),
                            child: Icon(
                              Icons.undo_rounded,
                              size: 18,
                              color: c.blue,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
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
