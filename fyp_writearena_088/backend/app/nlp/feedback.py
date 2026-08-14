def generate_feedback(plag: float, ai: float, quality: float, details: dict) -> str:
    parts = []
    word_count = details.get("word_count", 0)
    readability = details.get("readability", 0.5)
    ttr = details.get("vocabulary_richness", 0.5)

    if plag > 0.6:
        parts.append("Your submission shows significant overlap with existing content. Focus on developing your own unique perspective and arguments.")
    elif plag > 0.3:
        parts.append("Some phrases in your writing closely resemble existing content. Try rephrasing key ideas in your own voice.")
    else:
        parts.append("Your writing shows strong originality — this is one of the most valuable qualities in competitive writing.")

    if ai > 0.7:
        parts.append("The analysis suggests this content may not be entirely original human writing. Authentic expression is at the heart of WriteArena — let your own voice come through.")
    elif ai > 0.4:
        parts.append("Your writing style has some patterns that reduce authenticity scores. Write more naturally and conversationally.")
    else:
        parts.append("Your authentic human voice comes through clearly — this significantly boosts your overall score.")

    if quality < 0.4:
        parts.append("Focus on varying your sentence length and structure. Mix short, punchy sentences with longer, more detailed ones.")
    elif quality < 0.6:
        if ttr < 0.5:
            parts.append("Expand your vocabulary — try replacing common words with more precise alternatives to improve your quality score.")
        if readability < 0.4:
            parts.append("Your sentences tend to be complex. Breaking them into shorter, clearer statements will improve readability.")
    else:
        parts.append("Your writing demonstrates strong quality — good sentence variety, vocabulary richness, and clear structure.")

    if word_count < 50:
        parts.append("Aim for at least 100 words to demonstrate depth of thought.")
    elif word_count > 150:
        parts.append("Well done on writing a substantive response — length combined with quality really shows in the score.")

    relevance = details.get("relevance")
    if relevance is not None:
        if relevance < 0.25:
            parts.append("Your writing drifts well away from the given topic — staying closer to the prompt would lift your score noticeably.")
        elif relevance < 0.55:
            parts.append("You touch on the topic but wander from it in places; tie your points back to the prompt more directly.")
        else:
            parts.append("You stay well on-topic, which the relevance check rewards.")

    return " ".join(parts)
