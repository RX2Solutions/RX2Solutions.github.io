---
layout: default
title: Scientific & Clinical
text-color: black
background: stock-photo-science-biotechnology-dna-illustration-and-abstract-illustration-1440959093.jpg
# do some sort of DNA graphic with our RPP or something> 
---
{% capture hero_text %}
# {{ page.title }}
Science is in our DNA. RX2 Solutions has been partnering with leading Medical Device, Biotechnology, Hospitals, Health Systems and Pharmaceutical companies for the better part of three decades.  Whether you are in Phase 1 or have an established presence, we are equipped to help you achieve your human capital goals.

Our proven formula for delivering on your Scientific & Clinical needs has been developed through decades of research. Our Scientific Process for recruitment will help your organization stay relevant and shape the future by acquiring top tiered talent.
{% endcapture %}
{% assign hero_text_html = hero_text | markdownify %}
{% include mainslider.html text-color="white" content=hero_text_html background=page.background %}

