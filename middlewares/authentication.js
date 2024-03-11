const { validateToken } = require("../services/authentication");

function checkForAuthenticationCookie(cookieName) {
    return (req, res, next) => {
        const tokenCookieValue = req.cookies[cookieName]

        if (!tokenCookieValue) {
            // If there's no token, just call next()
            return next();
        }

        try {
            const userPayload = validateToken(tokenCookieValue);
            req.user = userPayload;
        } catch (error) {
            // Handle the error if needed
            console.error("Error validating token:", error);
        }

        // Always call next() to pass control to the next middleware or route handler
        next();
    };
}

module.exports = {
    checkForAuthenticationCookie,
}
