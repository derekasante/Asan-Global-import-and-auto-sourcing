(function () {
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.querySelector("header nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
      });
    });
  }

  var trackForm = document.getElementById("trackForm");
  if (trackForm) {
    trackForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = trackForm.querySelector('input[name="tracking"]');
      var value = input ? input.value.trim() : "";
      if (!value) {
        input.focus();
        return;
      }
      window.location.href = "tracking.html?ref=" + encodeURIComponent(value);
    });
  }

  function showSuccess(message) {
    alert(message);
  }

  var quoteForm = document.getElementById("quoteForm");
  if (quoteForm) {
    quoteForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = quoteForm.querySelector('[name="name"]').value.trim();
      showSuccess(
        "Thanks " + name + "! Your quote request was received. We will contact you within 24 hours."
      );
      quoteForm.reset();
    });
  }

  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      showSuccess("Thank you! Your message has been sent. We will get back to you shortly.");
      contactForm.reset();
    });
  }

  var backTop = document.getElementById("backTop");
  if (backTop) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        backTop.classList.add("visible");
      } else {
        backTop.classList.remove("visible");
      }
    });
  }
})();
