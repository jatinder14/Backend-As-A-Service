import { Home } from "./home";
import { AboutUs } from "./about-us";
import { OurTeam } from "./our-team";
import { Careers } from "./careers";
import { Blogs } from "./blogs";
import { CommunityGuide } from "./community-guide";
import { Contact } from "./contact";
import { PrivacyPolicy } from "./privacy-policy";
import { TermsandConditions } from "./terms-and-conditions";
import { ListYourProperty } from "./list-your-property";
import { PropertyDetails } from "./property-details";

export const ItPageLanguage = (path: any) => {
  const propertyDetail = path?.includes("/") && path?.split("/");
  if (path === "/") {
    return [...Home];
  } else if (path === "/about-empire-infratech") {
    return [...AboutUs];
  } else if (path === "/our-team") {
    return [...OurTeam];
  } else if (path === "/careers") {
    return [...Careers];
  } else if (path === "/community-guide") {
    return [...CommunityGuide];
  } else if (path === "/blogs") {
    return [...Blogs];
  } else if (path === "/contact-us") {
    return [...Contact];
  } else if (path === "/privacy-policy") {
    return [...PrivacyPolicy];
  } else if (path === "/terms-and-conditions") {
    return [...TermsandConditions];
  } else if (path === "/list-your-property") {
    return [...ListYourProperty];
  } else if (path === `/property-details/${propertyDetail[2]}`) {
    return [...PropertyDetails];
  }
};
