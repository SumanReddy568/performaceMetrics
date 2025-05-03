let interactionCounts = {
    clicks: 0,
    scrolls: 0,
    keypresses: 0
};

document.addEventListener('click', () => {
    interactionCounts.clicks++;
    sendInteractionData();
});

document.addEventListener('scroll', () => {
    interactionCounts.scrolls++;
    sendInteractionData();
});

document.addEventListener('keypress', () => {
    interactionCounts.keypresses++;
    sendInteractionData();
});

function sendInteractionData() {
    chrome.runtime.sendMessage({
        type: 'userInteraction',
        data: interactionCounts
    });
}
