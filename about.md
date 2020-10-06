---
layout: default
title: About Us
text-color: white
---
{% capture hero_text %}
# Why RX2 Solutions?
RX2 Solutions was founded on the principle of being a _Respectfully Professional Company._ We have evolved from a Staffing firm into a Technology Company that delivers customized Staff Augmentation and Talent Acquisition Solutions in the areas of Accounting & Finance, Creative & Marketing, Engineering & Supply Chain,  Information Technology, and Scientific & Clinical. 

Our differentiator is our _Respectfully Professional Process,_ which has been derived from three decades of successful industry experience focusing on delivering solution-based talent acquisition and staffing strategies. The result is consultative approach, enjoyable experience, and professional result. 

* Mission Statement:  RX2 Solutions seeks to help build stronger organizations and allow others to achieve their goals through the creation and execution of world-class human capital strategies.
* Vision Statement:  To become the go-to resource for both job seekers and hiring managers through professionalism, integrity, and unparalleled service.
* Value Statement:  Be Respectfully Professional while maintaining honesty and integrity towards colleagues, customers, and candidates.

{% endcapture %}
{% assign hero_text_html = hero_text | markdownify %}

{% include mainslider.html text-color="white" content=hero_text_html background="stock-photo-abstract-polygonal-space-low-poly-dark-background-with-connecting-dots-and-lines-connection-550182499.jpg" %}
