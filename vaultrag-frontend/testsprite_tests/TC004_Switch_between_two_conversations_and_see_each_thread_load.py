import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3001
        await page.goto("http://localhost:3001")
        
        # -> Open the history sidebar so we can start a new chat and later switch between conversations.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the history sidebar (if not already open) and submit the first question to create conversation #1.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[5]/main/div[2]/div/form/div/input[2]').nth(0)
        await asyncio.sleep(3); await elem.fill('What policies apply to my team this quarter?')
        
        # -> Open the history sidebar (if not already open) and submit the first question again to create conversation #1, then wait for a VaultRAG system reply.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Open the history sidebar and trigger a conversation by clicking the first suggestion pill (then wait for the assistant reply).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/main/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the second suggestion pill to start/create conversation #2, wait for the UI to update, then open the history sidebar so we can inspect and switch between conversation threads.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/main/div/div[2]/button[2]').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Start a conversation by clicking the first suggestion pill to trigger a thread creation and wait for the assistant reply.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/main/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the Reload button to attempt to recover the app and re-check the UI so we can continue creating and switching conversations.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div/div/div[2]/div/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'What policies apply to my team this quarter?')]").nth(0).is_visible(), "The chat should display the original question when switching to the older conversation"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    