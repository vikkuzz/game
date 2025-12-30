"use client";

import React from "react";
import { BusinessCard } from "@/types/businessCard";
import { Card } from "@/components/Card";
import { cn } from "@/lib/utils";

interface BusinessCardPreviewProps {
  card: BusinessCard;
  className?: string;
  onShare?: () => void;
}

/**
 * Иконка социальной сети
 */
const SocialIcon = ({
  type,
  className,
}: {
  type: keyof BusinessCard["socialLinks"];
  className?: string;
}) => {
  const icons = {
    vkontakte: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.785 16.241s.287-.031.434-.194c.135-.149.131-.429.131-.655 0-.354.005-1.025-.002-1.605-.003-.456-.007-.932.004-1.285.002-.089.022-.184-.006-.261-.027-.078-.09-.127-.146-.17-.052-.039-.118-.067-.177-.077-.172-.029-.344-.052-.515-.087-.117-.024-.234-.052-.338-.103-.114-.056-.19-.138-.188-.282.001-.157.105-.246.232-.293.243-.09.498-.128.753-.16.586-.073 1.176-.118 1.767-.139.295-.011.591-.024.886-.006.32.02.628.083.894.252.115.073.218.167.29.282.07.112.13.231.158.362.03.144.054.29.071.436.057.484.067.971.096 1.456.009.152.026.306.061.455.02.085.062.165.122.224.051.051.118.085.188.1.08.017.162.006.243.01.252.011.505.029.756.053.098.009.197.023.293.047.104.026.2.072.274.149.051.053.089.118.099.193.011.083.013.167.003.25-.012.102-.048.199-.11.28-.052.068-.123.12-.206.149-.089.032-.184.045-.277.056-.492.059-.986.124-1.48.182-.099.012-.199.022-.298.033-.192.022-.384.042-.576.06-.04.004-.082.006-.123.004-.169-.008-.337-.028-.498-.078-.099-.031-.188-.084-.257-.16-.059-.064-.094-.141-.103-.226-.009-.08-.008-.161-.008-.242 0-.409-.011-.819-.017-1.228-.002-.156 0-.312-.006-.468-.003-.081-.015-.163-.038-.241-.02-.069-.055-.13-.106-.177-.038-.034-.085-.057-.135-.069-.069-.017-.139-.017-.209-.02-.26-.012-.52-.025-.78-.034-.079-.003-.158-.005-.237-.003-.268.006-.536.028-.802.065-.094.013-.187.035-.278.064-.115.037-.22.095-.299.183-.065.073-.107.16-.117.259-.011.105-.005.211-.005.318 0 .495-.004.99.003 1.485.002.138 0 .278-.015.415-.011.104-.04.205-.095.293-.046.073-.108.132-.183.168-.082.04-.173.062-.264.078-.192.034-.386.057-.579.082-.096.012-.193.024-.289.038-.187.027-.374.056-.561.083-.037.005-.075.008-.113.008-.173 0-.346-.02-.513-.061-.106-.026-.205-.072-.287-.141-.072-.06-.123-.137-.143-.226-.022-.098-.021-.199-.015-.299.012-.198.025-.396.046-.593.022-.208.05-.415.085-.621.027-.161.063-.321.109-.477.03-.101.074-.197.137-.278.054-.069.125-.123.21-.152.094-.032.193-.044.29-.058.331-.048.663-.087.996-.117.327-.029.655-.049.983-.061.328-.012.657-.015.985-.003.322.012.643.04.961.094.079.014.157.033.234.057.077.024.151.055.22.096.06.036.11.083.146.139.031.048.051.101.057.157.006.06.004.121.004.181 0 .12.002.24-.003.36-.005.12-.02.24-.043.358-.023.118-.058.233-.108.342-.04.087-.094.167-.165.228-.06.052-.132.09-.211.108-.087.02-.176.024-.264.031-.19.015-.38.028-.57.044-.38.032-.76.072-1.138.121-.075.01-.15.022-.225.035-.15.026-.299.055-.448.087-.037.008-.075.015-.113.023-.173.035-.346.073-.517.117-.033.009-.066.018-.099.028-.15.045-.298.095-.44.158-.071.032-.138.071-.198.12-.048.039-.086.086-.111.142-.022.049-.029.101-.03.153-.001.056 0 .112.004.168.007.112.02.224.04.335.021.112.05.222.091.327.033.084.077.163.137.228.05.054.112.095.186.117.081.024.165.031.248.039.18.017.36.03.54.045.36.03.72.068 1.078.116.071.009.142.02.213.033.142.026.283.056.423.091.035.009.07.018.105.028.14.04.278.085.413.137.067.026.13.058.188.1.047.033.086.074.113.124.023.042.031.088.033.135.002.05 0 .1-.003.15-.005.1-.017.2-.037.299-.02.099-.05.196-.091.287-.033.073-.077.14-.136.192-.049.043-.108.073-.175.089-.073.017-.148.02-.222.025-.16.01-.32.017-.48.026-.32.018-.64.04-.96.068-.08.007-.16.016-.24.027-.16.022-.32.048-.48.079-.04.008-.08.017-.12.027-.16.04-.318.085-.473.139-.078.027-.153.06-.223.102-.056.033-.102.075-.136.127-.028.042-.038.089-.041.137-.003.052 0 .104.004.156.007.104.022.208.044.31.022.103.054.203.098.297.035.075.081.143.142.193.05.041.11.068.177.083.073.016.148.018.222.023z" />
      </svg>
    ),
    telegram: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    instagram: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    facebook: (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  };

  return icons[type] || null;
};

/**
 * Компонент предпросмотра визитки
 */
export const BusinessCardPreview = React.memo(
  ({ card, className, onShare }: BusinessCardPreviewProps) => {
    const fullName = `${card.firstName} ${card.lastName}`;
    const hasSocialLinks = Object.values(card.socialLinks).some((link) => link);

    return (
      <Card
        className={cn(
          "max-w-md mx-auto bg-gradient-to-br from-blue-50 to-purple-50",
          className
        )}
        padding="xl">
        {/* Фото профиля */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {card.photoUrl ? (
              <img
                src={card.photoUrl}
                alt={fullName}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-4 border-white shadow-lg flex items-center justify-center text-white text-4xl font-bold">
                {card.firstName.charAt(0)}
                {card.lastName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Имя и фамилия */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-800">
          {fullName}
        </h2>

        {/* Должность и компания */}
        <div className="text-center mb-6">
          <p className="text-lg text-gray-700 font-medium">{card.position}</p>
          {card.company && (
            <p className="text-sm text-gray-600">{card.company}</p>
          )}
        </div>

        {/* Контактная информация */}
        <div className="space-y-3 mb-6">
          {card.phone && (
            <div className="flex items-center text-gray-700">
              <svg
                className="w-5 h-5 mr-3 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <a href={`tel:${card.phone}`} className="hover:text-blue-600 transition-colors">
                {card.phone}
              </a>
            </div>
          )}

          {card.email && (
            <div className="flex items-center text-gray-700">
              <svg
                className="w-5 h-5 mr-3 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <a href={`mailto:${card.email}`} className="hover:text-blue-600 transition-colors">
                {card.email}
              </a>
            </div>
          )}

          {card.website && (
            <div className="flex items-center text-gray-700">
              <svg
                className="w-5 h-5 mr-3 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              <a
                href={card.website.startsWith("http") ? card.website : `https://${card.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors">
                {card.website}
              </a>
            </div>
          )}

          {card.address && (
            <div className="flex items-center text-gray-700">
              <svg
                className="w-5 h-5 mr-3 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{card.address}</span>
            </div>
          )}
        </div>

        {/* Описание */}
        {card.description && (
          <div className="mb-6">
            <p className="text-gray-700 text-sm leading-relaxed">{card.description}</p>
          </div>
        )}

        {/* Социальные сети */}
        {hasSocialLinks && (
          <div className="flex justify-center gap-4 mb-6">
            {card.socialLinks.vkontakte && (
              <a
                href={card.socialLinks.vkontakte}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
                aria-label="ВКонтакте">
                <SocialIcon type="vkontakte" className="w-6 h-6" />
              </a>
            )}
            {card.socialLinks.telegram && (
              <a
                href={card.socialLinks.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
                aria-label="Telegram">
                <SocialIcon type="telegram" className="w-6 h-6" />
              </a>
            )}
            {card.socialLinks.instagram && (
              <a
                href={card.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
                aria-label="Instagram">
                <SocialIcon type="instagram" className="w-6 h-6" />
              </a>
            )}
            {card.socialLinks.facebook && (
              <a
                href={card.socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-blue-600 transition-colors"
                aria-label="Facebook">
                <SocialIcon type="facebook" className="w-6 h-6" />
              </a>
            )}
          </div>
        )}

        {/* Кнопка поделиться */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Поделиться
          </button>
        )}
      </Card>
    );
  }
);

BusinessCardPreview.displayName = "BusinessCardPreview";

